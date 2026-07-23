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
        order_main.order_status,
        order_main.payment_method,
        order_main.final_amount AS item_price,
        order_main.created_at AS order_date,
        order_main.created_at AS booking_date,
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
       LEFT JOIN experience_images ON experiences.id = experience_images.experience_id AND experience_images.is_primary = 1
       WHERE order_main.member_id = ?
       ORDER BY order_main.created_at DESC`,
      [memberId]
    );

    res.json({ success: true, orders: rows });
  } catch (error) {
    console.error("撈取會員訂單失敗：", error);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

// 2. 取消單一行程並退還 M 幣
router.post("/cancel", authenticate, async (req: Request, res: Response) => {
  const memberId = req.user?.id;
  const { order_id } = req.body;

  try {
    // 檢查訂單是否存在且屬於該會員
    const [orders] = await pool.query<RowDataPacket[]>(
      "SELECT id, order_status, final_amount, points_earned FROM order_main WHERE id = ? AND member_id = ?",
      [order_id, memberId]
    );

    const order = orders[0];
    if (!order) {
      return res.status(404).json({ success: false, message: "找不到該訂單" });
    }

    if (order.order_status === "cancelled") {
      return res.status(400).json({ success: false, message: "訂單早已取消" });
    }

    // 計算應退還的 M 幣 (以實付金額 1:1 轉換) 與 應扣除的已贈送 M 幣
    const refundPoints = Math.round(Number(order.final_amount));
    const earnedPointsToDeduct = Number(order.points_earned) || 0;

    // 更新訂單狀態為已取消
    await pool.query(
      "UPDATE order_main SET order_status = 'cancelled', updated_at = NOW() WHERE id = ?",
      [order_id]
    );

    // 更新會員 M 幣 (加上退款 M 幣 - 扣除已發放的獎勵點數)
    const netPointsChange = refundPoints - earnedPointsToDeduct;
    await pool.query(
      "UPDATE member SET current_points = GREATEST(0, current_points + ?) WHERE id = ?",
      [netPointsChange, memberId]
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
