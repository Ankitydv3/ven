import fs from "fs";
import path from "path";
import { ApiError } from "./ApiError";

const uploadDir = path.join(process.cwd(), "uploads", "tasks");

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

/** Store inline base64 photos on disk; return URL paths unchanged. */
export function persistInlineTaskPhoto(photoUrl?: string | null): string {
  const value = photoUrl?.trim() ?? "";
  if (!value) return "";
  if (!value.startsWith("data:image/")) {
    return value;
  }

  const match = value.match(/^data:image\/([\w+.-]+);base64,(.+)$/);
  if (!match) {
    throw new ApiError(400, "Invalid photo format");
  }

  const subtype = match[1].toLowerCase();
  const ext = subtype.includes("png") ? "png" : "jpg";
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length > 2 * 1024 * 1024) {
    throw new ApiError(400, "Photo is too large. Please use a smaller image.");
  }

  ensureUploadDir();
  const filename = `task-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/tasks/${filename}`;
}
