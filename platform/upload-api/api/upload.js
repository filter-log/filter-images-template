import { readFile, rm } from "node:fs/promises";
import formidable from "formidable";
import {
  buildPagesUrl,
  buildRelativePaths,
  incrementName,
  resolveDateParts,
  safeOriginalExtension,
  sanitizeFileStem,
  sanitizeFolderName,
} from "../lib/sanitize.js";
import { parseCookies, verifySessionToken } from "../lib/auth.js";
import { getGitHubToken, listExistingNames, putFile } from "../lib/github.js";

const owner = process.env.GITHUB_OWNER;
const activeRepo = process.env.ACTIVE_IMAGE_REPO;
const branch = process.env.GITHUB_BRANCH || "main";
const pagesPattern = process.env.PUBLIC_PAGES_BASE_PATTERN || "https://{{owner}}.github.io/{{repo}}";
const allowedOrigin = process.env.UPLOAD_PORTAL_ORIGIN || "";
const maxFilesPerRequest = Number(process.env.MAX_FILES_PER_REQUEST || 20);
const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_MB || 20) * 1024 * 1024;

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!owner || !activeRepo) {
    return res.status(500).json({ error: "Server is missing repository configuration." });
  }

  try {
    const session = verifySessionToken(parseCookies(req.headers.cookie || ""));

    if (!session.valid) {
      return res.status(401).json({ error: "업로드 인증이 필요합니다. 암호를 다시 입력하세요." });
    }

    const { fields, files } = await parseMultipart(req);
    const uploads = normalizeFiles(files.files || files.file || []);

    if (!uploads.length) {
      return res.status(400).json({ error: "No image files were uploaded." });
    }

    if (uploads.length > maxFilesPerRequest) {
      return res.status(400).json({ error: `Max ${maxFilesPerRequest} files per request.` });
    }

    const { year, month, isoDate } = resolveDateParts(fields.date?.[0] || fields.date);
    const folder = sanitizeFolderName(fields.folder?.[0] || fields.folder || "");
    const token = await getGitHubToken();
    const targetDirectory = `incoming/${year}/${month}${folder ? `/${folder}` : ""}`;
    const usedNames = await listExistingNames({
      owner,
      repo: activeRepo,
      branch,
      directory: targetDirectory,
      token,
    });

    const results = [];

    for (const upload of uploads) {
      if (upload.size > maxFileSizeBytes) {
        throw new Error(`File too large: ${upload.originalFilename}`);
      }

      const fileBuffer = await readFile(upload.filepath);
      const extension = safeOriginalExtension(upload.originalFilename);
      const basename = incrementName(sanitizeFileStem(upload.originalFilename), usedNames);
      const { stagingPath, publicPath, thumbPath } = buildRelativePaths({
        year,
        month,
        folder,
        basename,
        originalExtension: extension,
      });

      await putFile({
        owner,
        repo: activeRepo,
        branch,
        targetPath: stagingPath,
        contentBase64: fileBuffer.toString("base64"),
        message: `chore(upload): add ${basename}${extension}`,
        token,
      });
      await rm(upload.filepath, { force: true });

      const publicUrl = buildPagesUrl(pagesPattern, owner, activeRepo, publicPath);
      const thumbnailUrl = buildPagesUrl(pagesPattern, owner, activeRepo, thumbPath);

      results.push({
        repository: activeRepo,
        uploadedAt: isoDate,
        filename: `${basename}.webp`,
        relativePath: publicPath,
        publicUrl,
        thumbnailUrl,
        markdown: `![${basename}](${publicUrl})`,
      });
    }

    return res.status(200).json({
      ok: true,
      repository: activeRepo,
      items: results,
      note: "GitHub Actions will convert, resize, and publish these images shortly.",
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Upload failed." });
  }
}

function setCorsHeaders(req, res) {
  const origin = allowedOrigin || req.headers.origin || "";

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseMultipart(req) {
  const form = formidable({
    multiples: true,
    maxFiles: maxFilesPerRequest,
    maxFileSize: maxFileSizeBytes,
    filter: ({ mimetype }) => Boolean(mimetype && mimetype.startsWith("image/")),
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ fields, files });
    });
  });
}

function normalizeFiles(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
