/**
 * POST /api/payment-success-rewards
 * 核銷本單優惠券、發 M 幣、更新 total_spent / total_orders、重算 member_level
 * 不修改 order_main.order_status
 */
import { type Request, type Response, Router } from "express";
import type { RowDataPacket } from "mysql2";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js";

const router: Router = Router();

// --- 可調：M 幣 ---
const M_COIN_REWARD = {
  rate: 1,
  minEarn: 0,
  flatBonus: 0,
  preferOrderStored: true,
  rounding: "round" as "floor" | "round" | "ceil",
};

// --- 可調：優惠券 ---
const COUPON_REDEEM = {
  markUsed: true,
  okIfAlreadyUsed: true,
};

// --- 可調：累積／等級（與 api-member-level 門檻一致；訂單或消費達其一）---
type MemberLevel = "銅" | "銀" | "金";

const MEMBER_LEVEL = {
  enabled: true,
  spendField: "final_amount" as "final_amount" | "original_amount",
  orderCountDelta: 1,
  order: ["銅", "銀", "金"] as MemberLevel[],
  thresholds: {
    銅: { minOrders: 0, minSpent: 0 },
    銀: { minOrders: 3, minSpent: 5000 },
    金: { minOrders: 6, minSpent: 15000 },
  } as Record<MemberLevel, { minOrders: number; minSpent: number }>,
  onlyUpgrade: true,
};

type OrderRewardRow = RowDataPacket & {
  id: string;
  member_id: number;
  coupon_id: number | null;
  final_amount: number | string;
  original_amount?: number | string;
  points_earned: number | string;
  points_redeemed: number | string;
};

type MemberStatRow = RowDataPacket & {
  member_level: string;
  total_spent: number | string;
  total_orders: number | string;
  current_points: number | string;
};

function calcMCoinToGrant(order: OrderRewardRow): {
  amount: number;
  source: "order.points_earned" | "final_amount * rate";
  detail: string;
} {
  const finalAmount = Number(order.final_amount) || 0;
  const stored = Number(order.points_earned) || 0;

  if (M_COIN_REWARD.preferOrderStored) {
    const amount = Math.max(0, stored);
    return {
      amount,
      source: "order.points_earned",
      detail: `preferOrderStored=true → points_earned=${stored}`,
    };
  }

  const raw = finalAmount * M_COIN_REWARD.rate;
  let base: number;
  switch (M_COIN_REWARD.rounding) {
    case "floor":
      base = Math.floor(raw);
      break;
    case "ceil":
      base = Math.ceil(raw);
      break;
    case "round":
    default:
      base = Math.round(raw);
      break;
  }

  const withMin = Math.max(M_COIN_REWARD.minEarn, base);
  const amount = Math.max(0, withMin + M_COIN_REWARD.flatBonus);

  return {
    amount,
    source: "final_amount * rate",
    detail: `final_amount=${finalAmount} × rate=${M_COIN_REWARD.rate} → ${amount}`,
  };
}

function normalizeLevel(raw: string | null | undefined): MemberLevel {
  if (raw === "銀" || raw === "金" || raw === "銅") return raw;
  return "銅";
}

function levelRank(level: MemberLevel): number {
  return MEMBER_LEVEL.order.indexOf(level);
}

function resolveLevelByStats(
  totalOrders: number,
  totalSpent: number,
): { level: MemberLevel; detail: string } {
  const gold = MEMBER_LEVEL.thresholds.金;
  const silver = MEMBER_LEVEL.thresholds.銀;

  if (totalOrders >= gold.minOrders || totalSpent >= gold.minSpent) {
    return {
      level: "金",
      detail: `orders=${totalOrders}, spent=${totalSpent} → 金`,
    };
  }
  if (totalOrders >= silver.minOrders || totalSpent >= silver.minSpent) {
    return {
      level: "銀",
      detail: `orders=${totalOrders}, spent=${totalSpent} → 銀`,
    };
  }
  return {
    level: "銅",
    detail: `orders=${totalOrders}, spent=${totalSpent} → 銅`,
  };
}

function calcSpendDelta(order: OrderRewardRow): number {
  if (MEMBER_LEVEL.spendField === "original_amount") {
    return Math.max(0, Number(order.original_amount) || 0);
  }
  return Math.max(0, Number(order.final_amount) || 0);
}

function applyLevelPolicy(
  current: MemberLevel,
  computed: MemberLevel,
): MemberLevel {
  if (!MEMBER_LEVEL.onlyUpgrade) return computed;
  return levelRank(computed) > levelRank(current) ? computed : current;
}

router.post("/", authenticate, async (req: Request, res: Response) => {
  const memberId = req.user?.id;
  if (!memberId) {
    res.status(401).json({ success: false, message: "請先登入" });
    return;
  }

  const rawOrderId =
    typeof req.body?.order_id === "string"
      ? req.body.order_id.trim()
      : typeof req.body?.orderId === "string"
        ? req.body.orderId.trim()
        : "";

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let order: OrderRewardRow | undefined;

    if (rawOrderId) {
      const [rows] = await connection.query<OrderRewardRow[]>(
        `
          SELECT id, member_id, coupon_id, final_amount, original_amount,
                 points_earned, points_redeemed
          FROM order_main
          WHERE id = ? AND member_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [rawOrderId, memberId],
      );
      order = rows[0];
      if (!order) {
        await connection.rollback();
        res.status(404).json({
          success: false,
          message: "找不到此訂單，或訂單不屬於目前會員",
        });
        return;
      }
    } else {
      const [rows] = await connection.query<OrderRewardRow[]>(
        `
          SELECT id, member_id, coupon_id, final_amount, original_amount,
                 points_earned, points_redeemed
          FROM order_main
          WHERE member_id = ?
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE
        `,
        [memberId],
      );
      order = rows[0];
      if (!order) {
        await connection.rollback();
        res.status(404).json({
          success: false,
          message: "找不到可處理的訂單（請帶 order_id）",
        });
        return;
      }
    }

    const orderId = String(order.id);
    const couponId =
      order.coupon_id == null || order.coupon_id === 0
        ? null
        : Number(order.coupon_id);

    let coupon: {
      applied: boolean;
      already_used: boolean;
      member_coupon_id: number | null;
      coupon_id: number | null;
    } = {
      applied: false,
      already_used: false,
      member_coupon_id: null,
      coupon_id: couponId,
    };

    if (COUPON_REDEEM.markUsed && couponId != null) {
      const [unusedRows] = await connection.query<
        (RowDataPacket & { id: number; is_used: number })[]
      >(
        `
          SELECT id, is_used
          FROM member_coupons
          WHERE member_id = ? AND coupon_id = ? AND is_used = 0
          ORDER BY received_at ASC
          LIMIT 1
          FOR UPDATE
        `,
        [memberId, couponId],
      );

      if (unusedRows[0]) {
        await connection.query(
          `
            UPDATE member_coupons
            SET is_used = 1, used_at = NOW()
            WHERE id = ? AND member_id = ?
          `,
          [unusedRows[0].id, memberId],
        );
        coupon = {
          applied: true,
          already_used: false,
          member_coupon_id: Number(unusedRows[0].id),
          coupon_id: couponId,
        };
      } else {
        const [usedRows] = await connection.query<
          (RowDataPacket & { id: number })[]
        >(
          `
            SELECT id
            FROM member_coupons
            WHERE member_id = ? AND coupon_id = ? AND is_used = 1
            ORDER BY used_at DESC, id DESC
            LIMIT 1
          `,
          [memberId, couponId],
        );
        coupon = {
          applied: false,
          already_used: true,
          member_coupon_id: usedRows[0] ? Number(usedRows[0].id) : null,
          coupon_id: couponId,
        };
        if (!COUPON_REDEEM.okIfAlreadyUsed && !usedRows[0]) {
          await connection.rollback();
          res.status(400).json({
            success: false,
            message: "訂單有優惠券，但找不到對應的 member_coupons 持有紀錄",
          });
          return;
        }
      }
    }

    const [memberRows] = await connection.query<MemberStatRow[]>(
      `
        SELECT member_level, total_spent, total_orders, current_points
        FROM member
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [memberId],
    );
    const memberRow = memberRows[0];
    if (!memberRow) {
      await connection.rollback();
      res.status(404).json({ success: false, message: "找不到會員資料" });
      return;
    }

    const mCoin = calcMCoinToGrant(order);
    const pointsBefore = Number(memberRow.current_points) || 0;
    const pointsAfter = pointsBefore + Math.max(0, mCoin.amount);

    const levelBefore = normalizeLevel(memberRow.member_level);
    const spentBefore = Number(memberRow.total_spent) || 0;
    const ordersBefore = Number(memberRow.total_orders) || 0;

    let spendDelta = 0;
    let ordersDelta = 0;
    let spentAfter = spentBefore;
    let ordersAfter = ordersBefore;
    let levelComputed: MemberLevel = levelBefore;
    let levelAfter = levelBefore;
    let levelDetail = "skipped";

    if (MEMBER_LEVEL.enabled) {
      spendDelta = calcSpendDelta(order);
      ordersDelta = Math.max(0, MEMBER_LEVEL.orderCountDelta);
      spentAfter = spentBefore + spendDelta;
      ordersAfter = ordersBefore + ordersDelta;

      const resolved = resolveLevelByStats(ordersAfter, spentAfter);
      levelComputed = resolved.level;
      levelAfter = applyLevelPolicy(levelBefore, levelComputed);
      levelDetail = resolved.detail;
      if (MEMBER_LEVEL.onlyUpgrade && levelAfter !== levelComputed) {
        levelDetail += ` | onlyUpgrade：維持 ${levelBefore}`;
      } else if (levelAfter !== levelBefore) {
        levelDetail += ` | ${levelBefore} → ${levelAfter}`;
      }
    }

    await connection.query(
      `
        UPDATE member
        SET
          current_points = ?,
          total_spent = ?,
          total_orders = ?,
          member_level = ?
        WHERE id = ?
      `,
      [pointsAfter, spentAfter, ordersAfter, levelAfter, memberId],
    );

    await connection.commit();

    res.json({
      success: true,
      message: "處理完成",
      data: {
        order_id: orderId,
        coupon,
        m_coin: {
          granted: mCoin.amount,
          source: mCoin.source,
          detail: mCoin.detail,
          balance_before: pointsBefore,
          balance_after: pointsAfter,
          config_snapshot: {
            rate: M_COIN_REWARD.rate,
            minEarn: M_COIN_REWARD.minEarn,
            flatBonus: M_COIN_REWARD.flatBonus,
            preferOrderStored: M_COIN_REWARD.preferOrderStored,
            rounding: M_COIN_REWARD.rounding,
          },
        },
        member_progress: {
          enabled: MEMBER_LEVEL.enabled,
          spend_delta: spendDelta,
          spend_field: MEMBER_LEVEL.spendField,
          total_spent_before: spentBefore,
          total_spent_after: spentAfter,
          orders_delta: ordersDelta,
          total_orders_before: ordersBefore,
          total_orders_after: ordersAfter,
          level_before: levelBefore,
          level_computed: levelComputed,
          level_after: levelAfter,
          level_changed: levelBefore !== levelAfter,
          detail: levelDetail,
          thresholds: MEMBER_LEVEL.thresholds,
          only_upgrade: MEMBER_LEVEL.onlyUpgrade,
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("[POST /api/payment-success-rewards]", error);
    res.status(500).json({
      success: false,
      message: "處理失敗",
    });
  } finally {
    connection.release();
  }
});

export default router;
