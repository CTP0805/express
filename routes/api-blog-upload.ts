/**
 * =============================================================================
 * 【新手導讀】部落格「封面／單圖」上傳 API（Blog 子功能）
 * =============================================================================
 * 為什麼獨立檔案？
 *   若掛在 /api/blog/:id 同一支，Express 可能把 "upload" 誤判成 id。
 *   所以 index.ts 掛：app.use("/api/blog/upload", ...) 與 /api/blog 分開。
 *
 * 流程：
 *   1) 前端用 FormData 放檔案，欄位名必須叫 image
 *   2) authenticate 確認已登入
 *   3) multer（blogImageUpload）把檔存到 express/public/uploads/blog
 *   4) 回傳 path（寫進 DB）與 url（給 <img> 預覽）
 *
 * 和內文 base64 圖的差別：
 *   封面 → 這支 upload API
 *   編輯器內嵌圖 → blog-content-images.ts 在 POST/PUT 文章時處理
 * =============================================================================
 */
import { type Request, type Response, Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import {
  blogImageUpload,
  toBlogPublicPath,
} from "../utils/upload-blog-image.js";

const router: Router = Router();

// POST /api/blog/upload
// 中介層串接：先登入 → 再 multer 收檔 → 最後組 URL 回應
router.post(
  "/",
  authenticate,
  // 【區塊】multer 收檔：錯誤（格式／超過 5MB）在這裡變成 400 JSON
  (req: Request, res: Response, next) => {
    blogImageUpload.single("image")(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof Error ? err.message : "上傳失敗";
        // multer 檔案過大
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "LIMIT_FILE_SIZE"
        ) {
          res.status(400).json({
            success: false,
            message: "圖片不可超過 5MB",
          });
          return;
        }
        res.status(400).json({ success: false, message });
        return;
      }
      next();
    });
  },
  // 【區塊】收檔成功：把磁碟檔名轉成網站可開的路徑
  (req: Request, res: Response) => {
    try {
      // multer 成功後檔案在 req.file（不是 req.body）
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          message: "請選擇圖片檔案（欄位名稱：image）",
        });
        return;
      }

      const relativePath = toBlogPublicPath(file.filename);
      // 對外 URL：與目前 request 的 host 一致（含區網 IP）
      const base = `${req.protocol}://${req.get("host")}`;
      const absoluteUrl = `${base}${relativePath}`;

      res.status(201).json({
        success: true,
        message: "圖片上傳成功",
        path: relativePath,
        url: absoluteUrl,
      });
    } catch (error) {
      console.error("[POST /api/blog/upload]", error);
      res.status(500).json({ success: false, message: "上傳失敗" });
    }
  },
);

export default router;
