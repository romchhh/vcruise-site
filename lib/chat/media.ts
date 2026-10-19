import type { ChatAttachment } from "@/lib/cms/chat";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i;

export function isChatImage(attachment: Pick<ChatAttachment, "mime" | "url" | "name">) {
  const mime = (attachment.mime || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (IMAGE_EXT.test(attachment.url || "")) return true;
  if (IMAGE_EXT.test(attachment.name || "")) return true;
  return false;
}

export function guessMimeFromName(name: string, fallback = "application/octet-stream") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return fallback;
}
