import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const imagesRoot = path.join(repoRoot, "images");
const outputFile = path.join(repoRoot, "data", "images.json");
const owner = process.env.GITHUB_REPOSITORY_OWNER || process.env.GITHUB_OWNER || "";
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] || process.env.GITHUB_REPO || "";
const pagesBaseUrl =
  process.env.PUBLIC_PAGES_BASE_URL ||
  (owner && repo ? `https://${owner}.github.io/${repo}` : "");

const items = [];

await walkImages(imagesRoot);
items.sort((left, right) => {
  const leftKey = `${left.year}${String(left.month).padStart(2, "0")}${String(left.day || "00").padStart(2, "0")}${left.filename}`;
  const rightKey = `${right.year}${String(right.month).padStart(2, "0")}${String(right.day || "00").padStart(2, "0")}${right.filename}`;
  return leftKey < rightKey ? 1 : -1;
});

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(
  outputFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      repo,
      items,
    },
    null,
    2,
  ) + "\n",
);

async function walkImages(currentDir) {
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
      await walkImages(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".webp")) {
      continue;
    }

    const relative = path.relative(imagesRoot, fullPath).split(path.sep);
    const [year, month, ...rest] = relative;
    const filename = rest.pop();
    const folder = rest.join("/");
    const fileStat = await stat(fullPath);

    if (!year || !month || !filename) {
      continue;
    }

    const basePath = path.posix.join("images", year, month, folder, filename).replace(/\/+/g, "/");
    const thumbPath = path.posix.join("thumbs", year, month, folder, filename).replace(/\/+/g, "/");

    items.push({
      src: resolvePublicPath(basePath),
      thumb: resolvePublicPath(thumbPath),
      year: Number(year),
      month: Number(month),
      day: fileStat.mtime.getUTCDate(),
      folder,
      title: humanizeTitle(filename),
      filename,
      updatedAt: fileStat.mtime.toISOString(),
    });
  }
}

function resolvePublicPath(relativePath) {
  if (!pagesBaseUrl) {
    return `/${relativePath}`;
  }

  return `${pagesBaseUrl.replace(/\/$/, "")}/${relativePath}`;
}

function humanizeTitle(filename) {
  return filename
    .replace(/\.webp$/i, "")
    .split("-")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}
