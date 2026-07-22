/**
 * =============================================================================
 * 【新手導讀】內文 HTML 裡的 base64 圖片 → 存成真實檔案
 * =============================================================================
 * 問題：富文字編輯器常把圖變成 data:image/png;base64,xxxxx（很長）
 *       直接塞進 DB 會爆、也難快取。
 * 解法：存檔到 public/uploads/blog，HTML 改成 <img src="/uploads/blog/uuid.png">
 * 誰呼叫：api-blog.ts 的 POST（新增）、PUT（更新）文章時
 * 前端顯示：next 的 media / BlogMediaImage 會把相對路徑接上後端網域
 * =============================================================================
 */
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "blog");

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function ensureDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/** 單張 data URL → 寫檔 → 回傳 public path */
export function saveDataUrlToBlogPublic(dataUrl: string): string | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i.exec(
    dataUrl.trim(),
  );
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const b64 = match[2].replace(/\s/g, "");
  const ext = MIME_EXT[mime];
  if (!ext) return null;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    return null;
  }
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) return null;

  ensureDir();
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/blog/${filename}`;
}

/**
 * 掃描 HTML，把所有 data:image base64 存檔並替換成 /uploads/blog/...
 * 同一張 base64 只存一次（用 map 去重）
 */
export function persistHtmlDataImages(html: string): string {
  if (!html || !html.includes("data:image")) return html;

  const cache = new Map<string, string>();
  // 匹配 src="data:..." 或 src='data:...'
  return html.replace(
    /src\s*=\s*(["'])(data:image\/[a-zA-Z0-9.+-]+;base64,[\s\S]*?)\1/gi,
    (full, quote: string, dataUrl: string) => {
      let publicPath = cache.get(dataUrl);
      if (!publicPath) {
        publicPath = saveDataUrlToBlogPublic(dataUrl) ?? "";
        if (publicPath) cache.set(dataUrl, publicPath);
      }
      if (!publicPath) return full; // 無法轉換則保留原樣
      return `src=${quote}${publicPath}${quote}`;
    },
  );
}

/** cover_image / content_image 若是 data URL 也轉成路徑 */
export function persistSingleImageField(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t) return null;
  if (t.startsWith("data:image")) {
    return saveDataUrlToBlogPublic(t);
  }
  return t;
}
