import { application, type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, m.name,m.avatar_url, r.rating, r.comment, r.created_at,  ei.image_url AS experience_image, m.name AS member_name 
      FROM experience_reviews r 
      LEFT JOIN experiences e ON r.experience_id = e.id 
      LEFT JOIN member m ON r.member_id = m.id 
      LEFT JOIN experience_images ei ON e.id = ei.experience_id AND ei.is_primary = 1 ORDER BY r.rating DESC;`,
    );

    // 將查詢到的資料回傳給前端
    res.status(200).json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "伺服器錯誤" });
  }
});

export default router;
