import express, { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js"; // 後端檢查登入權限的 middleware 有需要登入才能用的 api 請加上

const router: Router = Router();

// 取得會員資料
router.get("/profile", authenticate, async (req: Request, res: Response) => {
  try {
      // authenticate 驗證成功後，req.user 一定會有資料
      const memberId = req.user!.id;

      // 根據 JWT 裡的會員 id 查詢資料庫
      const [members] = await pool.query(
        `
          SELECT
            id,
            name,
            email,
            phone,
            gender,
            birthday,
            avatar_url,
            member_level,
            current_points,
            total_spent,
            total_orders
          FROM member
          WHERE id = ?
        `,
        [memberId],
      );

      const member = (members as Record<string, unknown>[])[0];

      if (!member) {
        res.status(404).json({
          success: false,
          message: "找不到會員資料",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "會員資料取得成功",
        data: member,
      });
    } catch (error) {
      console.error("取得會員資料失敗：", error);

      res.status(500).json({
        success: false,
        message: "取得會員資料失敗",
      });
    }
  },
);

// 修改會員資料
router.put("/profile", authenticate, (req: Request, res: Response) => {
  
});

// 會員大頭貼上傳
router.post("/avatar", authenticate, (req: Request, res: Response) => {
  
});

// 會員大頭貼更新
router.put("/avatar", authenticate, (req: Request, res: Response) => {
  
});

// 取得最近瀏覽資料
router.get("/recently-viewed", authenticate, (req: Request, res: Response) => {
  
});

// 加入最近瀏覽
router.post("/recently-viewed", authenticate, (req: Request, res: Response) => {
  
});

// 刪除最近瀏覽
router.delete("/recently-viewed", authenticate, (req: Request, res: Response) => {
  
});

export default router;
