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

    // === 步驟 2：後端判定會員等級折扣（金=9折, 銀=95折, 銅=原價）===
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

    // 根據會員等級設定「折扣率」與「M幣回饋率
    let discountRate = 1.0;
    let rewardRate = 0.01; // 預設銅牌 1%

    if (member.member_level === "環遊旅人") {
      discountRate = 0.9;  // 金牌 9 折
      rewardRate = 0.05;    // 金牌 5% 回饋
    } else if (member.member_level === "探索旅人") {
      discountRate = 0.95; // 銀牌 95 折
      rewardRate = 0.03;    // 銀牌 3% 回饋
    }
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
      coupon_discount = Number(coupon.discount_amount);
    }

    // 計算應付總價 (final_amount)
    let final_amount =
      original_amount - levelDiscount - coupon_discount - points_redeemed;
    if (final_amount < 0) final_amount = 0;

    // 計算獲得的 M 幣 (實付金額 * 回饋率)
    const points_earned = Math.round(final_amount * rewardRate);

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
        const adultQty = Number(item.adult_quantity || 0);
        const childQty = Number(item.child_quantity || 0);
        const adultPrice = Number(item.adult_price || 0);
        const childPrice = Number(item.child_price || 0);
        // 1. 計算該項目的真實小計金額 (大人 + 小孩)
        const itemTotal = (adultQty * adultPrice) + (childQty * childPrice);
        // 2. 計算總人數
        const totalQuantity = adultQty + childQty;
        // 3. 基準單價 (若有大人帶大人價，沒大人帶小孩價)
        const unitPrice = adultQty > 0 ? adultPrice : childPrice;

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
          unitPrice,     // 對應 original_unit_price
          totalQuantity, // 對應 quantity (總人數)
          itemTotal,     // 對應 subtotal (項目小計)
        ],
      );
    }

    // D. 扣除會員 M 幣 (current_points)
    if (points_redeemed > 0) {
    await pool.query(
      "UPDATE member SET current_points = current_points - ? WHERE id = ?",
      [points_redeemed, memberId],
      );
    }

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

//(供 Payment 頁面使用) 取得單一訂單詳細資料 GET /api/checkout/order/:orderId 
router.get("/order/:orderId", authenticate, async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const memberId = req.user?.id;

  try {
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT id, original_amount, final_amount, points_earned 
       FROM order_main 
       WHERE id = ? AND member_id = ?`,
      [orderId, memberId]
    );

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "找不到該訂單" });
    }

    const order = orders[0];
    if (!order) {
      return res.status(404).json({ success: false, message: "找不到該訂單" });
    }

    // 撈取該訂單對應的商品名稱組合 (用來傳給綠界與 LINE Pay 的商品說明)
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT experiences.title 
       FROM order_items 
       JOIN experiences ON order_items.experience_id = experiences.id 
       WHERE order_items.order_id = ?`,
      [orderId]
    );

    const itemsSummary = items.map((i) => i.title).join("#") || "精選體驗行程";

    res.json({
      success: true,
     order: {
        id: order.id,
        original_amount: Number(order.original_amount),
        final_amount: Number(order.final_amount),
        points_earned: Number(order.points_earned),
        items_summary: itemsSummary,
      },
    });
  } catch (error) {
    console.error("撈取訂單詳情失敗：", error);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

//訂單完成success介面
router.post("/pay-success", authenticate, async (req: Request, res: Response) => {
  const { order_id, payment_method } = req.body;
  const memberId = req.user?.id;

  try {
    // 1. 撈出該筆訂單資料
    const [orders] = await pool.query<RowDataPacket[]>(
     "SELECT order_status, final_amount, points_earned, contact_email FROM order_main WHERE id = ? AND member_id = ?",
      [order_id, memberId]
    );

    const order = orders[0];
    if (!order) {
      return res.status(404).json({ success: false, message: "找不到該訂單" });
    }

    // 2. 使用原子更新 (Atomic Update)：確保只會執行一次，防止重複請求
    const [updateResult]: any = await pool.query(
      `UPDATE order_main 
       SET order_status = 'paid', 
           payment_method = COALESCE(?, payment_method), 
           updated_at = NOW() 
       WHERE id = ? AND order_status = 'pending'`,
      [payment_method, order_id]
    );

      //  只有「第一次成功改為 paid」的情境，才執行 M幣發放與會員升級累加
      if (updateResult.affectedRows > 0) {

      //同步將該筆訂單下的所有子項目 (order_items) 狀態改為 'paid'
      await pool.query(
        "UPDATE order_items SET item_status = 'confirmed' WHERE order_id = ?",
        [order_id]
      );

        const paidAmount = Number(order.final_amount) || 0;
        const pointsEarned = Number(order.points_earned) || 0;

        // A. 發放 M 幣、累加總消費金額 (total_spent)、累加訂單數 (total_orders)
      await pool.query(
        `UPDATE member 
         SET current_points = current_points + ?,
             total_spent = total_spent + ?,
             total_orders = total_orders + 1
         WHERE id = ?`,
        [pointsEarned, paidAmount, memberId]
      );

      // B. 撈出會員更新後的最新 total_spent 與 total_orders
      const [updatedMemberRows] = await pool.query<RowDataPacket[]>(
        "SELECT total_spent, total_orders, member_level FROM member WHERE id = ?",
        [memberId]
      );
      const currentMember = updatedMemberRows[0];

      if (currentMember) {
        const totalSpent = Number(currentMember.total_spent) || 0;
        const totalOrders = Number(currentMember.total_orders) || 0;

        // C. 判定最新會員等級 (金牌 > 銀牌 > 銅牌)
        // 門檻範例：金牌 (20,000元 或 10筆) / 銀牌 (8,000元 或 5筆)
        let newLevel = "啟程旅人";
        if (totalSpent >= 20000 || totalOrders >= 10) {
          newLevel = "環遊旅人";
        } else if (totalSpent >= 8000 || totalOrders >= 5) {
          newLevel = "探索旅人";
        }

        // D. 若等級有提升，更新資料庫的 member_level 欄位
        if (newLevel !== currentMember.member_level) {
          await pool.query(
            "UPDATE member SET member_level = ? WHERE id = ?",
            [newLevel, memberId]
          );
        }
      }
    }

    res.json({ success: true, email: order.contact_email });
  } catch (error) {
    console.error("更新付款成功狀態失敗：", error);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

export default router;
