import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const incomingRoot = path.join(repoRoot, "incoming");
const imagesRoot = path.join(repoRoot, "images");
const thumbsRoot = path.join(repoRoot, "thumbs");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const LONG_EDGE = Number(process.env.IMAGE_LONG_EDGE || 1600);
const THUMB_EDGE = Number(process.env.THUMB_LONG_EDGE || 400);
const QUALITY = Number(process.env.WEBP_QUALITY || 82);

let processedCount = 0;

await processIncomingRoot();

if (processedCount === 0) {
  console.log("No staged images found in incoming/.");
}

await import(new URL("./generate-images-json.mjs", import.meta.url));

console.log(`Processed ${processedCount} image(s).`);

async function processIncomingRoot() {
  let entries;

  try {
    entries = await readdir(incomingRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !DATE_PATTERN.test(entry.name)) {
      continue;
    }

    await processDateDirectory(entry.name);
  }
}

async function processDateDirectory(date) {
  const sourceDir = path.join(incomingRoot, date);
  const imageDir = path.join(imagesRoot, date);
  const thumbDir = path.join(thumbsRoot, date);

  await mkdir(imageDir, { recursive: true });
  await mkdir(thumbDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const reservedNames = new Set();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const baseName = sanitizeStem(path.parse(entry.name).name);
    const outputFilename = uniqueFilename(`${baseName || "image"}.webp`, reservedNames);
    const imageOutput = path.join(imageDir, outputFilename);
    const thumbOutput = path.join(thumbDir, outputFilename);

    const instance = sharp(sourcePath, { failOn: "none" }).rotate();
    const metadata = await instance.metadata();
    const longEdge = Math.max(metadata.width || 0, metadata.height || 0);
    const imagePipeline = instance.clone();

    if (longEdge > LONG_EDGE) {
      imagePipeline.resize({
        width: LONG_EDGE,
        height: LONG_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    await imagePipeline.webp({ quality: QUALITY }).toFile(imageOutput);

    await instance
      .clone()
      .resize({
        width: THUMB_EDGE,
        height: THUMB_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: Math.max(QUALITY - 8, 40) })
      .toFile(thumbOutput);

    await rm(sourcePath, { force: true });
    processedCount += 1;
  }

  await cleanupIfEmpty(sourceDir);
}

function sanitizeStem(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function uniqueFilename(candidate, reservedNames) {
  const extension = path.extname(candidate);
  const stem = path.basename(candidate, extension);
  let name = candidate;
  let counter = 2;

  while (reservedNames.has(name)) {
    name = `${stem}-${counter}${extension}`;
    counter += 1;
  }

  reservedNames.add(name);
  return name;
}

async function cleanupIfEmpty(dirPath) {
  if (dirPath === incomingRoot) {
    return;
  }

  const entries = await readdir(dirPath);

  if (entries.length === 0) {
    await rm(dirPath, { recursive: true, force: true });
    await cleanupIfEmpty(path.dirname(dirPath));
  }
}
