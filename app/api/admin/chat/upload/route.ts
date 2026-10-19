import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import { getCmsDataDir, uid } from "@/lib/cms/store";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_SIZE = 8 * 1024 * 1024;

function uploadsDir() {
  const dir = path.join(getCmsDataDir(), "uploads", "chat");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveMime(file: File) {
  if (file.type && ALLOWED.has(file.type)) return file.type;
  const ext = path.extname(file.name).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return file.type || "";
}

function extensionFor(type: string, filename: string) {
  const fromName = path.extname(filename).toLowerCase();
  if (
    fromName &&
    [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx"].includes(
      fromName
    )
  ) {
    return fromName;
  }
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  if (type === "application/pdf") return ".pdf";
  if (type.includes("wordprocessingml")) return ".docx";
  if (type === "application/msword") return ".doc";
  return ".bin";
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
  if (files.length > 5) {
    return NextResponse.json({ ok: false, error: "too_many" }, { status: 400 });
  }

  const items: Array<{
    url: string;
    name: string;
    mime: string;
    size: number;
  }> = [];

  for (const file of files) {
    const mime = resolveMime(file);
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { ok: false, error: "unsupported_type" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: "file_too_large" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${uid("chat")}${extensionFor(mime, file.name)}`;
    fs.writeFileSync(path.join(uploadsDir(), filename), buffer);
    items.push({
      url: `/api/media/chat/${filename}`,
      name: file.name.slice(0, 120),
      mime,
      size: file.size,
    });
  }

  return NextResponse.json({
    ok: true,
    items,
    urls: items.map((item) => item.url),
  });
}
