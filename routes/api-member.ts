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
});

// 修改會員資料
router.put("/profile", authenticate, (req: Request, res: Response) => {});

// 會員大頭貼上傳
router.post("/avatar", authenticate, (req: Request, res: Response) => {});

// 會員大頭貼更新
router.put("/avatar", authenticate, (req: Request, res: Response) => {});

// 取得最近瀏覽資料
router.get(
  "/recently-viewed",
  authenticate,
  (req: Request, res: Response) => {},
);

// 加入最近瀏覽
router.post(
  "/recently-viewed",
  authenticate,
  (req: Request, res: Response) => {},
);

// 刪除最近瀏覽
router.delete(
  "/recently-viewed",
  authenticate,
  (req: Request, res: Response) => {},
);

// 取得心願清單
router.get("/favorites", authenticate, async (req: Request, res: Response) => {
  try {
    const memberId = req.user!.id;

    const [rows] = await pool.query(
      `
        SELECT
          e.id,
          e.title,
          e.city,
          c.category_name,

          COALESCE(ps.adult_min_price, 0) AS price,
          ci.image_url,

          COALESCE(rs.rating, 0) AS rating,
          COALESCE(rs.review_count, 0) AS review_count

        FROM favorites f

        INNER JOIN experiences e
          ON e.id = f.experience_id

        LEFT JOIN experience_categories c
          ON e.category_id = c.id

        LEFT JOIN (
          SELECT
            experience_id,
            MIN(adult_price) AS adult_min_price
          FROM sessions
          WHERE status = 1
            AND start_time >= NOW()
            AND booking_deadline >= NOW()
          GROUP BY experience_id
        ) ps
          ON e.id = ps.experience_id

        LEFT JOIN (
          SELECT experience_id, image_url
          FROM (
            SELECT
              experience_id,
              image_url,
              ROW_NUMBER() OVER (
                PARTITION BY experience_id
                ORDER BY is_primary DESC, sort_order ASC, id ASC
              ) AS rn
            FROM experience_images
          ) ranked_images
          WHERE rn = 1
        ) ci
          ON e.id = ci.experience_id

        LEFT JOIN (
          SELECT
            experience_id,
            ROUND(AVG(rating), 1) AS rating,
            COUNT(*) AS review_count
          FROM experience_reviews
          GROUP BY experience_id
        ) rs
          ON e.id = rs.experience_id

        WHERE f.member_id = ?

        ORDER BY f.created_at DESC
      `,
      [memberId],
    );

    const favoriteItems = (rows as Record<string, unknown>[]).map((item) => ({
      ...item,
      id: Number(item.id),
      price: Number(item.price),
      rating: Number(item.rating),
      review_count: Number(item.review_count),
    }));

    const favoriteIds = favoriteItems.map((item) => item.id);

    res.status(200).json({
      status: "success",
      data: {
        favoriteIds,
        items: favoriteItems,
      },
    });
  } catch (error) {
    console.error("取得心願清單失敗：", error);

    res.status(500).json({
      status: "error",
      message: "取得心願清單失敗",
    });
  }
});

// 加入心願清單
router.post(
  "/favorites/:experienceId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const memberId = req.user!.id;
      const experienceId = Number(req.params.experienceId);

      if (!Number.isInteger(experienceId) || experienceId <= 0) {
        res.status(400).json({
          status: "error",
          message: "體驗編號不正確",
        });
        return;
      }

      await pool.query(
        `
          INSERT INTO favorites (member_id, experience_id)
          VALUES (?, ?)
        `,
        [memberId, experienceId],
      );

      res.status(201).json({
        status: "success",
        message: "已加入我的心願清單",
      });
    } catch (error) {
      const databaseError = error as { code?: string };

      if (databaseError.code === "ER_DUP_ENTRY") {
        res.status(409).json({
          status: "error",
          message: "此體驗已經加入心願清單",
        });
        return;
      }

      if (databaseError.code === "ER_NO_REFERENCED_ROW_2") {
        res.status(404).json({
          status: "error",
          message: "找不到此體驗",
        });
        return;
      }

      console.error("加入心願清單失敗：", error);

      res.status(500).json({
        status: "error",
        message: "加入心願清單失敗",
      });
    }
  },
);

// 從心願清單移除
router.delete(
  "/favorites/:experienceId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const memberId = req.user!.id;
      const experienceId = Number(req.params.experienceId);

      if (!Number.isInteger(experienceId) || experienceId <= 0) {
        res.status(400).json({
          status: "error",
          message: "體驗編號不正確",
        });
        return;
      }

      await pool.query(
        `
          DELETE FROM favorites
          WHERE member_id = ?
            AND experience_id = ?
        `,
        [memberId, experienceId],
      );

      res.status(200).json({
        status: "success",
        message: "已從心願清單移除",
      });
    } catch (error) {
      console.error("從心願清單移除失敗：", error);

      res.status(500).json({
        status: "error",
        message: "從心願清單移除失敗",
      });
    }
  },
);
export default router;
