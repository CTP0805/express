/**
 * 部落格圖片上傳 API
 *
 * 掛載：app.use("/api/blog/upload", apiBlogUploadRouter)
 * （獨立檔案，避免與 api-blog 的 /:id 路由衝突）
 *
 * POST /api/blog/upload
 *   - multipart field 名稱：image
 *   - 需登入（Cookie Kenny）
 *   - 成功回傳 { success, url, path }
 *     path = /uploads/blog/xxx.jpg（建議寫入 posts.cover_image）
 *     url  = 絕對網址（方便前端預覽）
 */
import { type Request, type Response, Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import {
  blogImageUpload,
  toBlogPublicPath,
} from "../utils/upload-blog-image.js";

const router: Router = Router();

router.post(
  "/",
  authenticate,
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
  (req: Request, res: Response) => {
    try {
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
