/**
 * Імпорт сирих файлів у canonical-структуру:
 * public/images/cruises/{standard|premium|luxury|ultra-luxury}/
 *   cover.png
 *   gallery/01.jpg …
 *   logos/01.png …
 *
 * Usage (from repo root):
 *   node scripts/organize-cruise-class-media.mjs <sourceDir> <classFolder>
 *
 * sourceDir — папка з підпапками gallery/ та logos/ (або файли в корені → gallery).
 * classFolder — standard | premium | luxury | ultra-luxury
 */
import fs from "node:fs";
import path from "node:path";

const exts = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const classFolder = process.argv[3];
const sourceDir = process.argv[2];

const allowed = new Set(["standard", "premium", "luxury", "ultra-luxury"]);

if (!sourceDir || !classFolder || !allowed.has(classFolder)) {
  console.error(
    "Usage: node scripts/organize-cruise-class-media.mjs <sourceDir> <standard|premium|luxury|ultra-luxury>"
  );
  process.exit(1);
}

const root = path.resolve(process.cwd());
const destRoot = path.join(root, "public/images/cruises", classFolder);

function listMedia(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((p) => fs.statSync(p).isFile() && exts.has(path.extname(p).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "en"));
}

function copySequential(files, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const f of fs.readdirSync(destDir)) {
    if (fs.statSync(path.join(destDir, f)).isFile()) fs.unlinkSync(path.join(destDir, f));
  }
  files.forEach((file, index) => {
    const ext = path.extname(file).toLowerCase();
    fs.copyFileSync(file, path.join(destDir, `${String(index + 1).padStart(2, "0")}${ext}`));
  });
  return files.length;
}

const src = path.resolve(sourceDir);
const gallerySrc = fs.existsSync(path.join(src, "gallery"))
  ? path.join(src, "gallery")
  : src;
const logosSrc = path.join(src, "logos");

const coverInSource = listMedia(src).find((p) =>
  path.basename(p).toLowerCase().startsWith("cover")
);

fs.mkdirSync(destRoot, { recursive: true });
if (coverInSource) {
  fs.copyFileSync(coverInSource, path.join(destRoot, "cover.png"));
}

const galleryFiles = listMedia(gallerySrc).filter((p) => p !== coverInSource);
const logoFiles = listMedia(logosSrc);

const g = copySequential(galleryFiles, path.join(destRoot, "gallery"));
const l = copySequential(logoFiles, path.join(destRoot, "logos"));

console.log(
  `Updated ${classFolder}: cover=${coverInSource ? "yes" : "kept"}, gallery=${g}, logos=${l}`
);
