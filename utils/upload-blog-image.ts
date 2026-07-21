/**
 * 部落格封面／頂圖上傳（multer）
 * - 存到 public/uploads/blog（由 express.static 對外提供）
 * - 不修改既有 upload-Image.ts（他人模組）
 */
import fs from "fs";
import path from "path";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "blog");

/** 確保資料夾存在 */
function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

ensureUploadDir();

const extMap: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  if (!extMap[file.mimetype]) {
    callback(new Error("僅支援 PNG、JPG、WebP、GIF、AVIF"));
    return;
  }
  callback(null, true);
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureUploadDir();
    callback(null, UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const ext = extMap[file.mimetype] ?? ".jpg";
    callback(null, `${uuidv4()}${ext}`);
  },
});

/** 單檔上限 5MB */
export const blogImageUpload = multer({
  fileFilter,
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** DB／API 回傳的相對路徑（搭配 static：/uploads/blog/xxx.jpg） */
export function toBlogPublicPath(filename: string): string {
  return `/uploads/blog/${filename}`;
}
