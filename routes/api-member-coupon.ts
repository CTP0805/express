/**
 * =============================================================================
 * 【新手導讀】M 幣 + 優惠券 API（你的負責範圍：member/coupon）
 * =============================================================================
 * 掛載：app.use("/api/member-coupon", ...) 
 * 前端頁：next/app/member/coupon/page.tsx
 *
 * 兩大支 API：
 *   GET  /benefits  → 一次拿：餘額、M幣流水、我的券、可兌換券池
 *   POST /redeem    → 輸入代碼（如 C1）寫入 member_coupons 領券
 *
 * 資料表怎麼分工：
 *   coupons         = 券「目錄」（有哪些券、折多少、有效期）
 *   member_coupons  = 會員「錢包裡的券」（誰領了、用過沒）
 *   member.current_points = 現在 M 幣餘額
 *   order_main      = 用 points_earned / points_redeemed 推導回饋與折抵流水
 *   order_items     = 用 refunded_points / cancelled_at 推導單項取消退款流水
 *
 * 付款成功後核銷／發幣／升等不在這裡：
 *   → 見 api-payment-success-rewards.ts（成功頁呼叫）
 *
 * 代碼格式：DB 沒有 code 欄，後端用 C + id（C1、C10）當兌換碼
 * =============================================================================
 */

// ---------- import：來源與用途 ----------
// express：Router / 請求回應型別
import { type Request, type Response, Router } from "express";
// mysql2：
//   RowDataPacket = SELECT 列
//   ResultSetHeader = INSERT/UPDATE 結果（含 insertId、affectedRows）
import type { ResultSetHeader, RowDataPacket } from "mysql2";
// DB 連線池
import pool from "../utils/connect-mysql.js";
// 登入中介層
import { authenticate } from "../middlewares/authenticate.js";

// 本檔路由；index 掛 /api/member-coupon
const router: Router = Router();

// ---------- 小工具：券碼 C1 ↔ 資料庫 id=1 ----------
/** DB 無券碼欄位：以前綴 C + id 作為兌換碼（例：C1、C10） */
function couponCodeFromId(id: number): string {
  return `C${id}`;
}

/** 使用者輸入 "C3" → 3；格式不對回 null */
function parseCouponCode(raw: string): number | null {
  const code = raw.trim().toUpperCase();
  const m = /^C(\d+)$/.exec(code);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function toDateStr(value: Date | string | null | undefined): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

type CouponRow = RowDataPacket & {
  id: number;
  coupon_name: string;
  min_spent: number | string;
  discount_amount: number | string;
  start_date: Date | string;
  end_date: Date | string;
};

type MemberCouponRow = RowDataPacket & {
  mc_id: number;
  member_id: number;
  coupon_id: number;
  is_used: number | boolean;
  received_at: Date | string;
  used_at: Date | string | null;
  coupon_name: string;
  min_spent: number | string;
  discount_amount: number | string;
  start_date: Date | string;
  end_date: Date | string;
};

type OrderPointRow = RowDataPacket & {
  id: string;
  points_earned: number;
  points_redeemed: number;
  created_at: Date | string;
  order_status: string;
};

type ItemRefundRow = RowDataPacket & {
  item_id: number;
  order_id: string;
  refunded_points: number;
  cancelled_at: Date | string;
};

type MemberPointRow = RowDataPacket & {
  current_points: number;
};

export type MemberCouponStatus =
  | "available"
  | "scheduled"
  | "used"
  | "expired";

/**
 * 【邏輯】把 DB 的 is_used + 日期 → 前端篩選用的狀態字
 * available=可用 / scheduled=尚未開始 / used=已使用 / expired=已過期
 */
function deriveStatus(
  isUsed: boolean,
  startDate: string,
  endDate: string,
  now = new Date(),
): MemberCouponStatus {
  if (isUsed) return "used";
  const nowMs = now.getTime();
  // end_date 當日 23:59:59 仍有效
  const endMs = new Date(`${endDate}T23:59:59`).getTime();
  const startMs = new Date(`${startDate}T00:00:00`).getTime();
  if (endMs < nowMs) return "expired";
  if (startMs > nowMs) return "scheduled";
  return "available";
}

function mapCoupon(row: CouponRow) {
  const id = Number(row.id);
  return {
    id,
    coupon_name: row.coupon_name,
    /** 前端顯示用合成代碼 */
    code: couponCodeFromId(id),
    min_spent: Number(row.min_spent),
    discount_amount: Number(row.discount_amount),
    start_date: toDateStr(row.start_date),
    end_date: toDateStr(row.end_date),
    // 相容舊 UI 欄位命名（固定金額折抵）
    discount_type: "fixed" as const,
    discount_value: Number(row.discount_amount),
    min_order_amount: Number(row.min_spent),
    max_discount: null as number | null,
    title: row.coupon_name,
    description: `滿 NT$${Number(row.min_spent)} 折抵 NT$${Number(row.discount_amount)}`,
    starts_at: `${toDateStr(row.start_date)}T00:00:00.000Z`,
    expires_at: `${toDateStr(row.end_date)}T23:59:59.000Z`,
  };
}

function mapMemberCouponView(row: MemberCouponRow) {
  const base = mapCoupon({
    id: row.coupon_id,
    coupon_name: row.coupon_name,
    min_spent: row.min_spent,
    discount_amount: row.discount_amount,
    start_date: row.start_date,
    end_date: row.end_date,
  } as CouponRow);

  const isUsed = Boolean(row.is_used);
  const status = deriveStatus(
    isUsed,
    toDateStr(row.start_date),
    toDateStr(row.end_date),
  );

  return {
    ...base,
    member_coupon_id: Number(row.mc_id),
    member_id: Number(row.member_id),
    coupon_id: Number(row.coupon_id),
    is_used: isUsed,
    received_at: toIso(row.received_at) ?? new Date().toISOString(),
    used_at: toIso(row.used_at),
    status,
    order_id: null as string | null,
  };
}

// =============================================================================
// 【區塊】GET /api/member-coupon/benefits
// 誰用：coupon/page.tsx → fetchMemberBenefits()
// 回傳大致結構：{ wallet, transactions, coupons, redeemable_codes }
// =============================================================================
router.get("/benefits", authenticate, async (req: Request, res: Response) => {
  try {
    const memberId = req.user!.id;

    // (1) M 幣餘額
    const [memberRows] = await pool.query<MemberPointRow[]>(
      `SELECT current_points FROM member WHERE id = ? LIMIT 1`,
      [memberId],
    );
    const member = memberRows[0];
    if (!member) {
      res.status(404).json({ success: false, message: "找不到會員資料" });
      return;
    }

    // (2) 由 order_main / order_items 推導 M幣流水（沒有獨立 point_transactions 表）
    const [orderRows] = await pool.query<OrderPointRow[]>(
      `
        SELECT id, points_earned, points_redeemed, created_at, order_status
        FROM order_main
        WHERE member_id = ?
        ORDER BY created_at DESC
      `,
      [memberId],
    );
    const [refundRows] = await pool.query<ItemRefundRow[]>(
      `
        SELECT
          oi.id AS item_id,
          oi.order_id,
          oi.refunded_points,
          oi.cancelled_at
        FROM order_items AS oi
        INNER JOIN order_main AS om ON om.id = oi.order_id
        WHERE om.member_id = ?
          AND oi.item_status = 'cancelled'
          AND oi.refunded_points > 0
          AND oi.cancelled_at IS NOT NULL
        ORDER BY oi.cancelled_at DESC
      `,
      [memberId],
    );

    type Tx = {
      id: number;
      user_id: number;
      title: string;
      amount: number;
      type: "earn" | "spend" | "refund" | "expire";
      status: "earned" | "used" | "expired";
      order_id: string | null;
      created_at: string;
      expires_at: string | null;
    };

    const transactions: Tx[] = [];
    let txId = 1;
    for (const order of orderRows) {
      const created = toIso(order.created_at) ?? new Date().toISOString();
      if (Number(order.points_earned) > 0) {
        transactions.push({
          id: txId++,
          user_id: memberId,
          title: `訂單消費回饋 · ${order.id}`,
          amount: Number(order.points_earned),
          type: "earn",
          status: "earned",
          order_id: order.id,
          created_at: created,
          expires_at: null,
        });
      }
      if (Number(order.points_redeemed) > 0) {
        transactions.push({
          id: txId++,
          user_id: memberId,
          title: `結帳折抵 M幣 · ${order.id}`,
          amount: -Number(order.points_redeemed),
          type: "spend",
          status: "used",
          order_id: order.id,
          created_at: created,
          expires_at: null,
        });
      }
    }
    for (const refund of refundRows) {
      transactions.push({
        id: txId++,
        user_id: memberId,
        title: `取消單一商品退還 M幣 · ${refund.order_id}`,
        amount: Number(refund.refunded_points),
        type: "refund",
        status: "earned",
        order_id: refund.order_id,
        created_at:
          toIso(refund.cancelled_at) ?? new Date().toISOString(),
        expires_at: null,
      });
    }

    transactions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const [ownedRows] = await pool.query<MemberCouponRow[]>(
      `
        SELECT
          mc.id AS mc_id,
          mc.member_id,
          mc.coupon_id,
          mc.is_used,
          mc.received_at,
          mc.used_at,
          c.coupon_name,
          c.min_spent,
          c.discount_amount,
          c.start_date,
          c.end_date
        FROM member_coupons mc
        INNER JOIN coupons c ON c.id = mc.coupon_id
        WHERE mc.member_id = ?
        ORDER BY mc.received_at DESC
      `,
      [memberId],
    );

    const coupons = ownedRows.map(mapMemberCouponView);

    // 可兌換：尚未持有且未過期
    const ownedIds = new Set(ownedRows.map((r) => Number(r.coupon_id)));
    const [allCoupons] = await pool.query<CouponRow[]>(
      `
        SELECT id, coupon_name, min_spent, discount_amount, start_date, end_date
        FROM coupons
        ORDER BY id ASC
      `,
    );

    const now = new Date();
    const redeemable_codes = allCoupons
      .filter((c) => !ownedIds.has(Number(c.id)))
      .filter((c) => {
        const endMs = new Date(`${toDateStr(c.end_date)}T23:59:59`).getTime();
        return endMs >= now.getTime();
      })
      .map(mapCoupon);

    res.status(200).json({
      success: true,
      message: "會員優惠資料取得成功",
      data: {
        wallet: {
          user_id: memberId,
          balance: Number(member.current_points) || 0,
          redeem_threshold: 10,
          updated_at: new Date().toISOString(),
        },
        transactions,
        coupons,
        redeemable_codes,
      },
    });
  } catch (error) {
    console.error("[GET /api/member-coupon/benefits]", error);
    res.status(500).json({ success: false, message: "取得優惠資料失敗" });
  }
});

// =============================================================================
// 【區塊】POST /api/member-coupon/redeem
// 誰用：RedeemCouponForm → redeemCouponCode("C1")
// 步驟：驗格式 → 查 coupons 是否存在 → 是否過期 → 是否已領過 → INSERT member_coupons
// =============================================================================
router.post("/redeem", authenticate, async (req: Request, res: Response) => {
  try {
    const memberId = req.user!.id;
    // 前端 body: { code: "C1" }
    const rawCode = String(
      (req.body as { code?: string })?.code ?? "",
    ).trim();
    if (!rawCode) {
      res.status(400).json({ success: false, message: "請輸入優惠券代碼" });
      return;
    }

    const couponId = parseCouponCode(rawCode);
    if (couponId == null) {
      res.status(400).json({
        success: false,
        message: "代碼格式錯誤，請使用 C 開頭加編號（例如 C1）",
      });
      return;
    }

    // 券目錄是否存在
    const [couponRows] = await pool.query<CouponRow[]>(
      `
        SELECT id, coupon_name, min_spent, discount_amount, start_date, end_date
        FROM coupons WHERE id = ? LIMIT 1
      `,
      [couponId],
    );
    const catalog = couponRows[0];
    if (!catalog) {
      res.status(404).json({ success: false, message: "查無此優惠券代碼" });
      return;
    }

    const now = new Date();
    const endMs = new Date(
      `${toDateStr(catalog.end_date)}T23:59:59`,
    ).getTime();
    if (endMs < now.getTime()) {
      res.status(400).json({
        success: false,
        message: "此優惠券已過期，無法領取",
      });
      return;
    }

    const [owned] = await pool.query<RowDataPacket[]>(
      `
        SELECT id FROM member_coupons
        WHERE member_id = ? AND coupon_id = ?
        LIMIT 1
      `,
      [memberId, couponId],
    );
    if (owned.length > 0) {
      res.status(400).json({ success: false, message: "您已擁有此優惠券" });
      return;
    }

    const [insertResult] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO member_coupons (member_id, coupon_id, is_used, received_at, used_at)
        VALUES (?, ?, 0, NOW(), NULL)
      `,
      [memberId, couponId],
    );

    const [rows] = await pool.query<MemberCouponRow[]>(
      `
        SELECT
          mc.id AS mc_id,
          mc.member_id,
          mc.coupon_id,
          mc.is_used,
          mc.received_at,
          mc.used_at,
          c.coupon_name,
          c.min_spent,
          c.discount_amount,
          c.start_date,
          c.end_date
        FROM member_coupons mc
        INNER JOIN coupons c ON c.id = mc.coupon_id
        WHERE mc.id = ?
        LIMIT 1
      `,
      [insertResult.insertId],
    );

    const created = rows[0];
    if (!created) {
      res.status(500).json({ success: false, message: "領取後讀取失敗" });
      return;
    }

    res.status(201).json({
      success: true,
      message: `成功領取「${catalog.coupon_name}」`,
      data: { coupon: mapMemberCouponView(created) },
    });
  } catch (error) {
    console.error("[POST /api/member-coupon/redeem]", error);
    res.status(500).json({ success: false, message: "兌換失敗，請稍後再試" });
  }
});

export default router;
