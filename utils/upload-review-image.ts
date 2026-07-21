/**
 * 評價圖片上傳（multer）— 獨立檔，不改他人 upload-Image
 * public/uploads/reviews
 */
import fs from "fs";
import path from "path";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "reviews");

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
};

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  if (!extMap[file.mimetype]) {
    callback(new Error("僅支援 PNG、JPG、WebP、GIF"));
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

export const reviewImageUpload = multer({
  fileFilter,
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function toReviewPublicPath(filename: string): string {
  return `/uploads/reviews/${filename}`;
}
