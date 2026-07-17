import express, { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";
import { success } from "zod";
import { authenticate } from "../middlewares/authenticate.js";

const router: Router = Router();

//取cart購物車資料到畫面
router.get("/cart", async (req: Request, res: Response) => {
  try {
    const sql = `
    SELECT 
  cart.id AS cartId,                                          
  cart.experience_id AS experienceId,                    
  cart.session_id AS sessionId,                            
  experiences.title AS name,                                   
  sessions.adult_price AS price,      
  cart.quantity,                                       
  sessions.start_time AS sessionName,                      
  experience_images.image_url AS image 
FROM cart
INNER JOIN experiences 
  ON cart.experience_id = experiences.id
INNER JOIN sessions 
  ON cart.session_id = sessions.id
LEFT JOIN experience_images 
  ON cart.experience_id = experience_images.experience_id 
  AND experience_images.is_primary = 1
WHERE cart.member_id = 1;
`;
    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("取得購物車資料失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器內部錯誤，無法取得購物車資料",
    });
  }
});

//刪除購物車指定商品 API
router.delete("/cart-items", async (req: Request, res: Response) => {
  try {
    const { experienceId, sessionId } = req.query;

    if (!experienceId || !sessionId) {
      return res.status(400).json({ success: false, message: "缺少必要參數" });
    }
    //刪除該會員(目前固定為2) 在該場次的該行程購物車紀錄
    const sql = `
      DELETE FROM cart 
      WHERE member_id = 1 
        AND experience_id = ? 
        AND session_id = ?;
    `;

    //執行 SQL 刪除指令，並帶入安全參數, 帶入佔位符?可以防止駭客入侵(惡意攻擊)
    await pool.query(sql, [experienceId, sessionId]);

    res.status(200).json({
      success: true,
      message: "成功自資料庫移除該購物車商品",
    });
  } catch (error) {
    console.error("刪除購物車商品失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器內部錯誤，無法刪除商品",
    });
  }
});

//商品資料渲染, 取推薦商品進畫面
router.get("/experience", async (req: Request, res: Response) => {
  try {
    const sql = `
  SELECT 
    experiences.id,
    experiences.title,
    experiences.city,
    experience_images.image_url AS primaryImage,
    MIN(sessions.adult_price) AS minPrice
  FROM experiences
  LEFT JOIN experience_images 
    ON experiences.id = experience_images.experience_id 
    AND experience_images.is_primary = 1
  LEFT JOIN sessions 
    ON experiences.id = sessions.experience_id
  GROUP BY 
    experiences.id, 
    experiences.title, 
    experiences.city, 
    experience_images.image_url
  ORDER BY experiences.id ASC
  LIMIT 8;
`;

    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("取得行程商品失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器內部錯誤，無法取得商品資料",
    });
  }
});

//處理cart數量增減
router.put("/update", async (req, res) => {
  const { userId, experienceId, sessionId, quantity } = req.body;
  const memberId = 1; // 目前前端與後端統一寫死 1 號會員

  // 安全防呆：確保前端傳過來的數量最少為 1
  const targetQty = quantity < 1 ? 1 : quantity;

  try {
    const sql = `
      UPDATE cart 
      SET quantity = ? 
      WHERE member_id = ? AND experience_id = ? AND session_id = ?
    `;

    // 執行更新數量資料
    const [result] = await pool.execute(sql, [
      quantity,
      userId,
      experienceId,
      sessionId,
    ]);

    res.status(200).json({
      success: true,
      message: "購物車商品數量已更新",
    });
  } catch (error) {
    console.error("更新購物車數量失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器內部錯誤，無法更新數量",
    });
  }
});


export default router;
