import path from "node:path";

export function sanitizeFolderName(value = "") {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
}

export function sanitizeFileStem(filename) {
  const baseName = path.basename(filename, path.extname(filename));

  const sanitized = baseName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "image";
}

export function safeOriginalExtension(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".tiff", ".tif", ".heic", ".heif", ".avif"]);
  return allowed.has(ext) ? ext : ".jpg";
}

export function resolveDateParts(inputDate) {
  const date = inputDate ? new Date(`${inputDate}T12:00:00Z`) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date. Expected YYYY-MM-DD.");
  }

  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
    isoDate: date.toISOString().slice(0, 10),
  };
}

export function buildRelativePaths({ year, month, folder, basename, originalExtension }) {
  const folderPrefix = folder ? `${folder}/` : "";

  return {
    stagingPath: `incoming/${year}/${month}/${folderPrefix}${basename}${originalExtension}`,
    publicPath: `images/${year}/${month}/${folderPrefix}${basename}.webp`,
    thumbPath: `thumbs/${year}/${month}/${folderPrefix}${basename}.webp`,
  };
}

export function incrementName(base, usedNames) {
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }

  let index = 2;
  while (usedNames.has(`${base}-${index}`)) {
    index += 1;
  }
  const resolved = `${base}-${index}`;
  usedNames.add(resolved);
  return resolved;
}

export function buildPagesUrl(pattern, owner, repo, relativePath) {
  const baseUrl = pattern
    .replace("{{owner}}", owner)
    .replace("{{repo}}", repo)
    .replace(/\/$/, "");

  return `${baseUrl}/${relativePath}`;
}
