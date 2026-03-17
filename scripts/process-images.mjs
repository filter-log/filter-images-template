import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const incomingRoot = path.join(repoRoot, "incoming");
const imagesRoot = path.join(repoRoot, "images");
const thumbsRoot = path.join(repoRoot, "thumbs");

const LONG_EDGE = Number(process.env.IMAGE_LONG_EDGE || 1600);
const THUMB_EDGE = Number(process.env.THUMB_LONG_EDGE || 400);
const QUALITY = Number(process.env.WEBP_QUALITY || 82);

let processedCount = 0;

await processDirectory(incomingRoot);

if (processedCount === 0) {
  console.log("No staged images found in incoming/.");
}

await import(new URL("./generate-images-json.mjs", import.meta.url));

console.log(`Processed ${processedCount} image(s).`);

async function processDirectory(currentDir) {
  let entries;

  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relative = path.relative(incomingRoot, fullPath).split(path.sep);
    const [year, month, ...rest] = relative;
    const sourceFilename = rest.pop();

    if (!year || !month || !sourceFilename) {
      continue;
    }

    const baseName = sourceFilename.replace(/\.[^.]+$/, "");
    const folder = rest.join(path.sep);
    const outputFilename = `${baseName}.webp`;
    const imageDir = path.join(imagesRoot, year, month, folder);
    const thumbDir = path.join(thumbsRoot, year, month, folder);
    const imageOutput = path.join(imageDir, outputFilename);
    const thumbOutput = path.join(thumbDir, outputFilename);

    await mkdir(imageDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });

    const instance = sharp(fullPath, { failOn: "none" }).rotate();
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
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY - 8 })
      .toFile(thumbOutput);

    await rm(fullPath, { force: true });
    processedCount += 1;
  }

  await cleanupIfEmpty(currentDir);
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
