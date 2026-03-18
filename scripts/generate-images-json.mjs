import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const imagesRoot = path.join(repoRoot, "images");
const outputFile = path.join(repoRoot, "data", "images.json");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const items = [];

await collectImages();

items.sort((left, right) => {
  if (left.date !== right.date) {
    return left.date < right.date ? 1 : -1;
  }

  return left.filename.localeCompare(right.filename);
});

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(items, null, 2)}\n`);

async function collectImages() {
  let dateEntries;

  try {
    dateEntries = await readdir(imagesRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const dateEntry of dateEntries) {
    if (!dateEntry.isDirectory() || !DATE_PATTERN.test(dateEntry.name)) {
      continue;
    }

    const dateDir = path.join(imagesRoot, dateEntry.name);
    const fileEntries = await readdir(dateDir, { withFileTypes: true });

    for (const fileEntry of fileEntries) {
      if (!fileEntry.isFile() || !fileEntry.name.toLowerCase().endsWith(".webp")) {
        continue;
      }

      const filename = fileEntry.name;
      items.push({
        src: `images/${dateEntry.name}/${filename}`,
        thumb: `thumbs/${dateEntry.name}/${filename}`,
        date: dateEntry.name,
        title: humanizeTitle(filename),
        filename,
      });
    }
  }
}

function humanizeTitle(filename) {
  return filename
    .replace(/\.webp$/i, "")
    .split("-")
    .filter(Boolean)
    .join(" ");
}
