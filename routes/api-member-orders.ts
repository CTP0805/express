import express, { type Request, type Response, Router } from "express";
import type { RowDataPacket } from "mysql2/promise";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js";

const router: Router = Router();
// 1. 撈取會員所有的行程訂單列表 (以 order_items 為單位)
router.get("/", authenticate, async (req: Request, res: Response) => {
  const memberId = req.user?.id;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        order_items.id AS item_id,
        order_main.id AS order_id,
        order_items.item_status AS order_status,
        order_main.payment_method,
        order_items.subtotal AS item_price,
        order_main.final_amount,
        order_main.created_at AS order_date,
        sessions.start_time AS booking_date,
        order_main.coupon_discount,
        order_main.points_redeemed,
        experiences.id AS experience_id,
        experiences.title,
        experiences.city AS location,
        experience_images.image_url,
        order_items.quantity
       FROM order_items
       JOIN order_main ON order_items.order_id = order_main.id
       JOIN experiences ON order_items.experience_id = experiences.id
       LEFT JOIN sessions ON order_items.session_id = sessions.id
       LEFT JOIN experience_images ON experiences.id = experience_images.experience_id AND experience_images.is_primary = 1
       WHERE order_main.member_id = ?
       ORDER BY order_main.created_at DESC`,
      [memberId],
    );

    res.json({ success: true, orders: rows });
  } catch (error) {
    console.error("撈取會員訂單失敗：", error);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

// 2. 取消單一行程並退還 M 幣
router.post("/cancel", authenticate, async (req: Request, res: Response) => {
  const { item_id } = req.body;
  const memberId = req.user?.id;

  try {
    // 檢查訂單是否存在且屬於該會員
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        order_items.id AS item_id,
        order_items.item_status,
        order_items.subtotal,
        order_main.id AS order_id
      FROM order_items
      JOIN order_main ON order_items.order_id = order_main.id
      WHERE order_items.id = ? AND order_main.member_id = ?`,
      [item_id, memberId],
    );

    const item = rows[0];
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "找不到該預訂行程" });
    }

    if (item.item_status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "該行程已經取消過了" });
    }

    // 計算應退還的 M 幣 (以實付金額 1:1 轉換) 與 應扣除的已贈送 M 幣
    const refundPoints = Math.round(Number(item.subtotal) || 0);
    // B. 計算應扣除的當初贈送 M 幣
    const earnedPointsToDeduct = Math.round(Number(item.points_earned) || 0);

    // C. 將該筆 order_items 狀態更新為 'cancelled'
    await pool.query(
      "UPDATE order_items SET item_status = 'cancelled' WHERE id = ?",
      [item_id],
    );

    // 將退還的 M 幣全額加回會員帳戶
    await pool.query(
      "UPDATE member SET current_points = current_points + ? WHERE id = ?",
      [refundPoints, memberId]
    );

    res.json({
      success: true,
      message: "取消成功，實付金額已全額轉換為 M 幣退還！",
      refunded_points: refundPoints,
    });
  } catch (error) {
    console.error("取消訂單失敗：", error);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

export default router;
