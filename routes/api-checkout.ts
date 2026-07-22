import express, { type Request, type Response, Router } from "express";
import type { RowDataPacket } from "mysql2/promise";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js";

const router: Router = Router();

//初始化結帳優惠券 API
router.get("/coupons", authenticate, async (req: Request, res: Response) => {
  //從 req.user 拿登入者的 id
  const memberId = req.user?.id;

  const sql = `
   SELECT 
    member_coupons.coupon_id, 
    coupons.coupon_name, 
    coupons.min_spent, 
    coupons.discount_amount
  FROM member_coupons
  JOIN coupons ON member_coupons.coupon_id = coupons.id
  WHERE member_coupons.member_id = ? 
    AND member_coupons.is_used = 0 
    AND coupons.end_date >= NOW()
`;
  try {
    const [rows] = await pool.query(sql, [memberId]);

    // 把撈出來的真實優惠券清單回傳給前端
    res.status(200).json({
      success: true,
      coupons: rows,
    });
  } catch (error) {
    console.error("初始化優惠券失敗：", error);
    res.status(500).json({
      success: false,
      message: "伺服器內部錯誤，無法取得優惠券",
    });
  }
});

//建立訂單
router.post("/submit", authenticate, async (req: Request, res: Response) => {
  const memberId = req.user?.id;
  const {
    contact_name,
    contact_phone,
    contact_email,
    coupon_id, // 前端選的折價券 ID (沒有就傳 null)
    points_redeemed, // 前端輸入要折抵的 M 幣數量 (沒有就 0)
    payment_method = "credit_card",
  } = req.body;

  try {
    // === 步驟 1：後端撈取購物車，自己計算金額（防止前端竄改金額） ===
    // 撈出你的 cart 表商品
    const [cartItems] = await pool.query<RowDataPacket[]>(
      `SELECT 
    cart.id,
    cart.member_id,
    cart.experience_id,
    cart.session_id,
    cart.adult_quantity,
    cart.child_quantity,
    sessions.adult_price,
    sessions.child_price
  FROM cart
  JOIN sessions ON cart.session_id = sessions.id
  WHERE cart.member_id = ?`,
      [memberId],
    );
    if (!cartItems || cartItems.length === 0)
      return res.status(400).json({ success: false, message: "購物車是空的" });

    // 分別計算 (大人數 × 大人價) + (小孩數 × 小孩價)
    let original_amount = 0;
    for (const item of cartItems) {
      const adultSubtotal =
        Number(item.adult_quantity || 0) * Number(item.adult_price || 0);
      const childSubtotal =
        Number(item.child_quantity || 0) * Number(item.child_price || 0);

      original_amount += adultSubtotal + childSubtotal;
    }

    // === 步驟 2：後端判定會員等級折扣 (對齊你的 member 表 member_level) ===
    const [members] = await pool.query<RowDataPacket[]>(
      "SELECT member_level, current_points FROM member WHERE id = ?",
      [memberId],
    );
    const member = members[0];
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }
    const discountRate = member.member_level === "金" ? 0.95 : 1.0;
    const levelDiscount = Math.round(original_amount * (1 - discountRate));

    // === 步驟 3：安全檢查 M 幣與折價券 ===
    if (points_redeemed > member.current_points) {
      return res.status(400).json({ success: false, message: "點數餘額不足" });
    }

    let coupon_discount = 0;
    if (coupon_id) {
      const [coupons] = await pool.query<RowDataPacket[]>(
        "SELECT discount_amount FROM coupons WHERE id = ?",
        [coupon_id],
      );
      const coupon = coupons[0];
      if (!coupon) {
        return res
          .status(400)
          .json({ success: false, message: "Coupon not found" });
      }
      coupon_discount = coupon.discount_amount;
    }

    // 計算應付總價 (final_amount)
    let final_amount =
      original_amount - levelDiscount - coupon_discount - points_redeemed;
    if (final_amount < 0) final_amount = 0;

    // 計算獲得的 M 幣
    const points_earned = Math.round(final_amount * 1) || 1;

    // === 步驟 4：寫入資料庫 (利用 Transaction 確保安全) ===
    // A. 生成訂單編號，例如：EU + 年月日 + 隨機流水號 (對齊你圖片中的 EU2607130001)
    const order_id = `EU${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${Math.floor(1000 + Math.random() * 9000)}`;

    // B. 寫入 order_main 主表
    await pool.query(
      `
      INSERT INTO order_main 
      (id, member_id, contact_name, contact_phone, contact_email, payment_method, order_status, original_amount, coupon_id, coupon_discount, points_redeemed, final_amount, points_earned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, NOW())
    `,
      [
        order_id,
        memberId,
        contact_name,
        contact_phone,
        contact_email,
        payment_method,
        original_amount,
        coupon_id,
        coupon_discount,
        points_redeemed,
        final_amount,
        points_earned,
      ],
    );

    // C. 寫入 order_items 明細表
    for (const item of cartItems) {
      const adultSubtotal =
        Number(item.adult_quantity || 0) * Number(item.adult_price || 0);
      const childSubtotal =
        Number(item.child_quantity || 0) * Number(item.child_price || 0);
      const itemTotal = adultSubtotal + childSubtotal; // 該商品總價
      const totalQuantity =
        Number(item.adult_quantity || 0) + Number(item.child_quantity || 0); // 總人數
      await pool.query(
        `
        INSERT INTO order_items 
        (order_id, experience_id, session_id, original_unit_price, quantity, subtotal, item_status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `,
        [
          order_id,
          item.experience_id,
          item.session_id,
          item.price,
          item.adult_price, // 單價用成人價為基準或平均價
          totalQuantity, // 總人數
          itemTotal, // 該項目總金額
        ],
      );
    }

    // D. 扣除會員 M 幣 (current_points)
    await pool.query(
      "UPDATE member SET current_points = current_points - ? WHERE id = ?",
      [points_redeemed, memberId],
    );

    // E. 把 member_coupons 狀態標記為已使用 (is_used = 1)
    if (coupon_id) {
      await pool.query(
        "UPDATE member_coupons SET is_used = 1, used_at = NOW() WHERE member_id = ? AND coupon_id = ?",
        [memberId, coupon_id],
      );
    }

    // F. 清空該會員的購物車暂存
    await pool.query("DELETE FROM cart WHERE member_id = ?", [memberId]);

    // === 步驟 5：大功告成，回傳訂單編號給前端，準備去付款頁面 ===
    res.json({ success: true, order_id, final_amount });
  } catch (error) {
    console.error("提交訂單失敗，詳細錯誤原因：", error);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});
export default router;
