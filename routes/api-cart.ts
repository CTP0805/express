import express, { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js";

const router: Router = Router();

//取cart購物車資料到畫面
router.get("/cart", authenticate, async (req: Request, res: Response) => {
  try {
    //從 req.user 拿登入者的 id
    const memberId = req.user?.id;

    const sql = `
      SELECT 
        cart.id AS cartId,                             
        cart.experience_id AS experienceId,                    
        cart.session_id AS sessionId,                            
        experiences.title AS name,                             
        IFNULL(sessions.adult_price, 0) AS adultPrice,      
        IFNULL(sessions.child_price, 0) AS childPrice,      
        IFNULL(cart.adult_quantity, 1) AS adultQuantity,
        IFNULL(cart.child_quantity, 0) AS childQuantity, 
        DATE_FORMAT(sessions.start_time, '%Y-%m-%d %H:%i') AS sessionName,
        sessions.booking_deadline AS bookingDeadline,
        sessions.max_participants AS maxParticipants,
        sessions.status AS sessionStatus,
        experience_images.image_url AS image 
      FROM cart
      INNER JOIN experiences ON cart.experience_id = experiences.id
      INNER JOIN sessions ON cart.session_id = sessions.id
      LEFT JOIN experience_images 
        ON cart.experience_id = experience_images.experience_id 
        AND experience_images.is_primary = 1
      WHERE cart.member_id = ?;
    `;
    const [rows] = await pool.query(sql, [memberId]);

    const now = new Date();
    // 整理回傳資料並加上 isSoldOut 判定
    const cartData = (rows as any[]).map((row: any) => {
      // 判斷 1: 報名截止時間是否已過期
      const isExpired = row.bookingDeadline ? new Date(row.bookingDeadline) <= now : false;
      const adultQty = Number(row.adultQuantity) || 1;
      const childQty = Number(row.childQuantity) || 0;
      const totalQty = adultQty + childQty;
      const adultP = Number(row.adultPrice) || 0;
      const childP = Number(row.childPrice) || 0;
      const maxParticipants = Number(row.maxParticipants) || 0;

      // 判斷 2: 購物車數量是否超過最大允許人數，或場次停售 (sessionStatus === 0)
      const isOverMax = maxParticipants > 0 && totalQty > maxParticipants;
      const isStatusDisabled = row.sessionStatus === 0;

      // 只要「過期」、「停售」或「超出人數上限」，都算 Sold Out！
      const isSoldOut = isExpired || isOverMax || isStatusDisabled;

      return {
        ...row,
        adultQuantity: adultQty,
        childQuantity: childQty,
        adultPrice: adultP,
        childPrice: childP,
        quantity: adultQty + childQty,
        itemTotal: adultQty * adultP + childQty * childP,
        isSoldOut: isExpired, // 完售 / 截止判定
        isExpired: isExpired, // 備用：給前端顯示是「過期」還是「額滿
      };
    });

    res.status(200).json({
      success: true,
      data: cartData,
    });
  } catch (error) {
    console.error("取得購物車資料失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器內部錯誤，無法取得購物車資料",
    });
  }
});

//加入onAdd商品到購物車
router.post("/add", authenticate, async (req: Request, res: Response) => {
  const {
    experienceId,
    sessionId,
    adultQuantity = 1,
    childQuantity = 0,
  } = req.body;

  const memberId = req.user?.id;

  const validAdult = adultQuantity < 0 ? 0 : adultQuantity;
  const validChild = childQuantity < 0 ? 0 : childQuantity;

  try {
    // 1. 檢查這名會員的購物車，是否本來就已經有這個商品與場次
    const checkSql = `
      SELECT id, adult_quantity, child_quantity FROM cart 
      WHERE member_id = ? AND experience_id = ? AND session_id = ?
    `;
    const [existingRows]: any = await pool.query(checkSql, [
      memberId,
      experienceId,
      sessionId,
    ]);

    if (existingRows.length > 0) {
      // 狀況 A: 商品已存在 -> 累加數量 (舊數量 + 新傳入的數量)
      const newAdultQty = existingRows[0].adult_quantity + validAdult;
      const newChildQty = existingRows[0].child_quantity + validChild;
      const updateSql = `UPDATE cart SET adult_quantity = ?, child_quantity = ? WHERE id = ?`;
      await pool.query(updateSql, [
        newAdultQty,
        newChildQty,
        existingRows[0].id,
      ]);
    } else {
      // 狀況 B: 商品不存在 -> 新增一筆紀錄
      const insertSql = `
        INSERT INTO cart (member_id, experience_id, session_id, adult_quantity, child_quantity) 
        VALUES (?, ?, ?, ?, ?)
      `;
      await pool.query(insertSql, [
        memberId,
        experienceId,
        sessionId,
        validAdult,
        validChild,
      ]);
    }

    res.status(200).json({
      success: true,
      message: "商品已成功加入購物車",
    });
  } catch (error) {
    console.error("後端加入購物車失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器內部錯誤，無法加入購物車",
    });
  }
});

//刪除onRemove購物車指定商品 API
router.delete(
  "/cart-items",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const memberId = req.user?.id;
      const { experienceId, sessionId } = req.query;

      if (!experienceId || !sessionId) {
        return res
          .status(400)
          .json({ success: false, message: "缺少必要參數" });
      }
      //刪除該會員 在該場次的該行程購物車紀錄
      const sql = `
        DELETE FROM cart 
        WHERE member_id = ? AND experience_id = ? AND session_id = ?;
      `;

      //執行 SQL 刪除指令，並帶入安全參數, 帶入佔位符?可以防止駭客入侵(惡意攻擊)
      await pool.query(sql, [memberId, experienceId, sessionId]);

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
  },
);

//處理cart數量增減
router.put("/update", authenticate, async (req: Request, res: Response) => {
  const { experienceId, sessionId, adultQuantity, childQuantity } = req.body;
  const memberId = req.user?.id;

  try {
    const sql = `
    UPDATE cart 
      SET adult_quantity = ?, child_quantity = ?
      WHERE member_id = ? AND experience_id = ? AND session_id = ?
    `;

    // 執行更新數量資料
    await pool.execute(sql, [
      adultQuantity,
      childQuantity,
      memberId,
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

//編輯/更換購物車商品場次與數量
router.put("/edit", authenticate, async (req: Request, res: Response) => {
  const { experienceId, oldSessionId, newSessionId, newAdultQuantity, newChildQuantity } = req.body;
  const memberId = req.user?.id;

  try {
    // 1. 刪除原本舊場次的資料
    const deleteSql = `
      DELETE FROM cart 
      WHERE member_id = ? AND experience_id = ? AND session_id = ?
    `;
    await pool.query(deleteSql, [memberId, experienceId, oldSessionId]);

    // 2. 檢查新選擇的場次是否存在
    const checkSql = `
      SELECT id, adult_quantity, child_quantity FROM cart
      WHERE member_id = ? AND experience_id = ? AND session_id = ?
    `;
    const [existingRows]: any = await pool.query(checkSql, [
      memberId,
      experienceId,
      newSessionId,
    ]);

    if (existingRows.length > 0) {
      // 狀況 A: 新場次原本就在購物車裡 -> 合併數量
      const totalAdult = existingRows[0].adult_quantity + newAdultQuantity;
      const totalChild = existingRows[0].child_quantity + newChildQuantity;
      const updateSql = `UPDATE cart SET adult_quantity = ?, child_quantity = ? WHERE id = ?`;
      await pool.query(updateSql, [totalAdult, totalChild, existingRows[0].id]);
    } else {
      // 狀況 B: 新場次是全新的項目 -> 直接新增一筆
      const insertSql = `
        INSERT INTO cart (member_id, experience_id, session_id, adult_quantity, child_quantity) 
        VALUES (?, ?, ?, ?, ?)
      `;
      await pool.query(insertSql, [
        memberId,
        experienceId,
        newSessionId,
        newAdultQuantity,
        newChildQuantity,
      ]);
    }

    res.status(200).json({
      success: true,
      message: "購物車編輯成功",
    });
  } catch (error) {
    console.error("後端編輯購物車失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器內部錯誤，無法更新編輯資料",
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
    MIN(sessions.adult_price) AS minPrice,
    COALESCE(rs.rating, 0) AS rating,    
    COALESCE(rs.review_count, 0) AS review_count
  FROM experiences
  LEFT JOIN experience_images 
    ON experiences.id = experience_images.experience_id 
    AND experience_images.is_primary = 1
  LEFT JOIN sessions 
    ON experiences.id = sessions.experience_id
  LEFT JOIN (
    SELECT 
      experience_id,
      ROUND(AVG(rating), 1) AS rating,
      COUNT(*) AS review_count
    FROM experience_reviews 
    GROUP BY experience_id
  ) rs 
    ON experiences.id = rs.experience_id
  GROUP BY 
    experiences.id,
    experiences.title,
    experiences.city,
    experience_images.image_url,
    rs.rating,
    rs.review_count
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
