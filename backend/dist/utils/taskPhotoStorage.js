"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistInlineTaskPhoto = persistInlineTaskPhoto;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ApiError_1 = require("./ApiError");
const uploadDir = path_1.default.join(process.cwd(), "uploads", "tasks");
function ensureUploadDir() {
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
}
/** Store inline base64 photos on disk; return URL paths unchanged. */
function persistInlineTaskPhoto(photoUrl) {
    const value = photoUrl?.trim() ?? "";
    if (!value)
        return "";
    if (!value.startsWith("data:image/")) {
        return value;
    }
    const match = value.match(/^data:image\/([\w+.-]+);base64,(.+)$/);
    if (!match) {
        throw new ApiError_1.ApiError(400, "Invalid photo format");
    }
    const subtype = match[1].toLowerCase();
    const ext = subtype.includes("png") ? "png" : "jpg";
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 2 * 1024 * 1024) {
        throw new ApiError_1.ApiError(400, "Photo is too large. Please use a smaller image.");
    }
    ensureUploadDir();
    const filename = `task-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    fs_1.default.writeFileSync(path_1.default.join(uploadDir, filename), buffer);
    return `/uploads/tasks/${filename}`;
}
