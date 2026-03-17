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
import {
  createBlob,
  createCommit,
  createTree,
  getBranchHead,
  getGitHubToken,
  listExistingNames,
  updateBranchRef,
} from "../lib/github.js";
import { resolveRepositoryOwner, resolveTargetRepository } from "../lib/repository.js";

const owner = resolveRepositoryOwner();
const targetRepo = resolveTargetRepository();
const branch = process.env.GITHUB_BRANCH || "main";
const pagesPattern = process.env.PUBLIC_PAGES_BASE_PATTERN || "https://{{owner}}.github.io/{{repo}}";
const allowedOrigin = process.env.UPLOAD_PORTAL_ORIGIN || "";
const maxFilesPerRequest = Number(process.env.MAX_FILES_PER_REQUEST || 100);
const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_MB || 20) * 1024 * 1024;
const blobConcurrency = Number(process.env.BLOB_UPLOAD_CONCURRENCY || 5);

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!owner || !targetRepo) {
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
      repo: targetRepo,
      branch,
      directory: targetDirectory,
      token,
    });

    const prepared = [];
    const failed = [];

    for (const upload of uploads) {
      let queued = false;

      try {
        if (upload.size > maxFileSizeBytes) {
          throw new Error(`파일 크기 제한 초과 (${Math.round(maxFileSizeBytes / (1024 * 1024))}MB).`);
        }

        const extension = safeOriginalExtension(upload.originalFilename);
        const basename = incrementName(sanitizeFileStem(upload.originalFilename), usedNames);
        const { stagingPath, publicPath, thumbPath } = buildRelativePaths({
          year,
          month,
          folder,
          basename,
          originalExtension: extension,
        });

        prepared.push({
          sourceName: upload.originalFilename || basename,
          basename,
          extension,
          filepath: upload.filepath,
          stagingPath,
          publicPath,
          thumbPath,
        });
        queued = true;
      } catch (error) {
        failed.push({
          sourceName: upload.originalFilename || "unknown",
          stage: "prepare",
          message: error.message || "파일 준비 중 오류가 발생했습니다.",
        });
      } finally {
        if (!queued) {
          await rm(upload.filepath, { force: true });
        }
      }
    }

    const blobSettled = await mapWithConcurrency(prepared, blobConcurrency, async (item) => {
      try {
        const fileBuffer = await readFile(item.filepath);
        const blob = await createBlob({
          owner,
          repo: targetRepo,
          contentBase64: fileBuffer.toString("base64"),
          token,
        });
        return { ...item, blobSha: blob.sha };
      } finally {
        await rm(item.filepath, { force: true });
      }
    });

    const committedItems = [];

    blobSettled.forEach((result) => {
      if (result.status === "fulfilled") {
        committedItems.push(result.value);
        return;
      }

      failed.push({
        sourceName: result.item.sourceName,
        stage: "github",
        message: result.reason?.message || "GitHub blob 생성에 실패했습니다.",
      });
    });

    if (!committedItems.length) {
      return res.status(failed.length ? 400 : 500).json({
        ok: false,
        repository: targetRepo,
        succeeded: [],
        failed,
      });
    }

    try {
      const head = await getBranchHead({
        owner,
        repo: targetRepo,
        branch,
        token,
      });

      const tree = await createTree({
        owner,
        repo: targetRepo,
        baseTreeSha: head.treeSha,
        token,
        entries: committedItems.map((item) => ({
          path: item.stagingPath,
          mode: "100644",
          type: "blob",
          sha: item.blobSha,
        })),
      });

      const commit = await createCommit({
        owner,
        repo: targetRepo,
        message: `chore(upload): add ${committedItems.length} incoming image${committedItems.length > 1 ? "s" : ""}`,
        treeSha: tree.sha,
        parentSha: head.commitSha,
        token,
      });

      await updateBranchRef({
        owner,
        repo: targetRepo,
        branch,
        commitSha: commit.sha,
        token,
      });
    } catch (error) {
      committedItems.forEach((item) => {
        failed.push({
          sourceName: item.sourceName,
          stage: "commit",
          message: error.message || "배치 커밋 생성에 실패했습니다.",
        });
      });

      return res.status(502).json({
        ok: false,
        repository: targetRepo,
        succeeded: [],
        failed,
      });
    }

    const succeeded = committedItems.map((item) => {
      const publicUrl = buildPagesUrl(pagesPattern, owner, targetRepo, item.publicPath);
      const thumbnailUrl = buildPagesUrl(pagesPattern, owner, targetRepo, item.thumbPath);

      return {
        repository: targetRepo,
        uploadedAt: isoDate,
        sourceName: item.sourceName,
        filename: `${item.basename}.webp`,
        relativePath: item.publicPath,
        publicUrl,
        thumbnailUrl,
        markdown: `![${item.basename}](${publicUrl})`,
      };
    });

    return res.status(200).json({
      ok: failed.length === 0,
      repository: targetRepo,
      totalFiles: uploads.length,
      committedCount: succeeded.length,
      failedCount: failed.length,
      succeeded,
      failed,
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

async function mapWithConcurrency(items, concurrency, iteratee) {
  const queue = items.map((item, index) => ({ item, index }));
  const settled = new Array(items.length);

  async function worker() {
    while (queue.length > 0) {
      const next = queue.shift();

      try {
        const value = await iteratee(next.item);
        settled[next.index] = { status: "fulfilled", value };
      } catch (reason) {
        settled[next.index] = { status: "rejected", item: next.item, reason };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return settled;
}
