import express, { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";

const router: Router = Router();

// 1. 取得商品詳情頁
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // 拿到網址上的商品 ID

    // 💡 根據你實際的資料表，進行精準的 LEFT JOIN 查詢
    const sql = `
  SELECT
    e.id,
    e.category_id,
    c.category_name,
    e.host_id,
    e.title,
    e.subtitle,
    e.description,
    e.notice,
    e.meeting_point,
    e.city,
    e.longitude,
    e.latitude,

    COALESCE(ps.adult_min_price, 0) AS price,
    COALESCE(ps.adult_min_price, 0) AS adult_price,
    COALESCE(ps.child_min_price, 0) AS child_price,
    COALESCE(ps.duration_minutes, 0) AS duration_minutes,

    ci.image_url AS image_url,

    COALESCE(rs.rating, 5.0) AS rating,
    COALESCE(rs.review_count, 0) AS review_count,

    h.name AS host_name,
    h.bio AS host_bio,
    h.avatar AS host_avatar,
    h.rating AS host_rating,
    h.role AS host_role

  FROM experiences e

  LEFT JOIN experience_categories c
    ON e.category_id = c.id

  LEFT JOIN hosts h
    ON e.host_id = h.id

  LEFT JOIN (
    SELECT
      experience_id,
      MIN(adult_price) AS adult_min_price,
      MIN(child_price) AS child_min_price,
      MIN(TIMESTAMPDIFF(MINUTE, start_time, end_time)) AS duration_minutes
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

  WHERE e.id = ?
  LIMIT 1
`;

    // 💡 2. 執行剛才宣告好的 sql 變數 (帶入 id 參數)
    const [rows] = await pool.query(sql, [id]);
    const experiences = rows as any[];

    // 如果找不到該商品，回傳 404
    if (experiences.length === 0 || !experiences[0].id) {
      return res.status(404).json({
        status: "error",
        message: "找不到該項體驗商品",
      });
    }

    const experience = experiences[0];

    const notesSql = `
  SELECT
    title,
    content
  FROM category_notes
  WHERE category_id = ?
  ORDER BY sort_order ASC, id ASC
`;

    const [noteRows] = await pool.query(notesSql, [experience.category_id]);
    const notes = noteRows as { title: string; content: string }[];

    // 成功找到，回傳單一商品物件
    res.json({
      status: "success",
      data: {
        ...experience,
        longitude:
          experience.longitude === null ? null : Number(experience.longitude),
        latitude:
          experience.latitude === null ? null : Number(experience.latitude),
        price: Number(experience.price),
        adult_price: Number(experience.adult_price),
        child_price: Number(experience.child_price),
        duration_minutes: Number(experience.duration_minutes),
        rating: Number(experience.rating),
        review_count: Number(experience.review_count),
        host_rating: Number(experience.host_rating),
        notes,
      },
    });
  } catch (error) {
    console.error("取得商品詳情失敗:", error);
    res.status(500).json({
      status: "error",
      message: "伺服器內部錯誤",
    });
  }
});

// 取得商品列表頁
// router.get("/experiences", (req: Request, res: Response) => {});

// 取得商品詳情頁
// router.get("/experiences/:id", (req: Request, res: Response) => {});

// 取得我的最愛
// router.get("/member/favorites", (req: Request, res: Response) => {});

// 將體驗加入我的最愛
// router.post("/member/favorites", (req: Request, res: Response) => {});

// 將體驗移除我的最愛
// router.delete("/member/favorites/:id", (req: Request, res: Response) => {});

export default router;
