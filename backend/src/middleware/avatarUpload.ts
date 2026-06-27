import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDir = path.join(process.cwd(), "uploads", "avatars");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${unique}${ext}`);
  },
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
  },
});
