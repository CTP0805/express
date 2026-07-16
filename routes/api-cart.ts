import express, { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";

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
WHERE cart.member_id = 2;
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

// 商品資料渲染, 取推薦商品進畫面
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

export default router;
