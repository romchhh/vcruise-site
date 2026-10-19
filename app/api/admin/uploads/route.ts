import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import { getCmsDataDir, uid } from "@/lib/cms/store";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_TYPES = new Set([...IMAGE_TYPES, ...VIDEO_TYPES]);

const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 80 * 1024 * 1024;

function uploadsDir() {
  const dir = path.join(getCmsDataDir(), "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionFor(type: string, filename: string) {
  const fromName = path.extname(filename).toLowerCase();
  if (
    fromName &&
    [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"].includes(
      fromName
    )
  ) {
    return fromName;
  }
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  if (type === "video/webm") return ".webm";
  if (type === "video/quicktime") return ".mov";
  if (type === "video/mp4") return ".mp4";
  return ".jpg";
}

function kindFor(type: string): "image" | "video" {
  return VIDEO_TYPES.has(type) ? "video" : "image";
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const files = form
    .getAll("files")
    .filter((item): item is File => item instanceof File);
  const single = form.get("file");
  if (single instanceof File) files.push(single);

  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "no_files" }, { status: 400 });
  }

  const urls: string[] = [];
  const items: Array<{ url: string; type: "image" | "video"; name: string }> =
    [];

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "unsupported_type" },
        { status: 400 }
      );
    }

    const max = VIDEO_TYPES.has(file.type) ? MAX_VIDEO : MAX_IMAGE;
    if (file.size > max) {
      return NextResponse.json(
        { ok: false, error: "file_too_large" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const prefix = VIDEO_TYPES.has(file.type) ? "vid" : "img";
    const filename = `${uid(prefix)}${extensionFor(file.type, file.name)}`;
    fs.writeFileSync(path.join(uploadsDir(), filename), buffer);
    const url = `/api/media/${filename}`;
    urls.push(url);
    items.push({ url, type: kindFor(file.type), name: file.name });
  }

  return NextResponse.json({
    ok: true,
    url: urls[0],
    urls,
    items,
  });
}
