import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getCmsDataDir } from "@/lib/cms/store";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { path: pathParts } = await params;
  const parts = pathParts || [];
  if (
    parts.length === 0 ||
    parts.some(
      (part) =>
        part.includes("..") || part.includes("/") || part.includes("\\")
    )
  ) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const filename = parts.join("/");
  const filePath = path.join(getCmsDataDir(), "uploads", filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
