/**
 * =============================================================================
 * 【新手導讀】付款成功後續 API（本人模組）
 * =============================================================================
 * 檔案：express/routes/api-payment-success-rewards.ts
 * 掛載：express/index.ts
 *   app.use("/api/payment-success-rewards", apiPaymentSuccessRewardsRouter)
 * 完整網址：POST http://localhost:3001/api/payment-success-rewards
 * 前端呼叫：next/app/member/coupon/api.ts → applyPaymentSuccessRewards()
 *           由 next/app/success/page.tsx 進頁時 useEffect 打一次
 *
 * ── M 幣正確流程（務必對齊）────────────────────────────
 *   ① 組員結帳 POST /api/checkout/submit
 *      → 只扣折抵：current_points -= points_redeemed
 *      → 例：餘額 1000，折抵 250 → 剩 750
 *      → 建 order_main（含 final_amount 實付、points_earned 預估值）
 *      → 此時「還沒」把消費回饋加進餘額
 *
 *   ② 本 API（進 success 後）
 *      → 讀「當下剩餘」pointsBefore（例 750）
 *      → 依本單實付 final_amount 算回饋（例 950，rate=1）
 *      → current_points = 750 + 950 = 1700
 *      → 同步核銷券、total_spent / total_orders、member_level
 *
 *   ③ 同 order_id 只入帳一次（表 payment_success_rewards_log）
 *
 * 不做的事：
 *   - 不改 order_main.order_status（付款狀態交給組員）
 *   - 不負責導頁綠界（ecpay）
 *
 * 可調常數：M_COIN_REWARD、COUPON_REDEEM、MEMBER_LEVEL（見下方）
 * =============================================================================
 */

// ---------- import：從哪來、幹嘛用 ----------
// express：Router 組子路由；Request/Response = req/res 的型別
import { type Request, type Response, Router } from "express";
// mysql2：
//   RowDataPacket  = SELECT 一列的型別
//   ResultSetHeader = INSERT/UPDATE 結果（affectedRows、insertId）
import type { ResultSetHeader, RowDataPacket } from "mysql2";
// 專案 DB 連線池：pool.getConnection() 拿交易連線
import pool from "../utils/connect-mysql.js";
// 登入中介層：檢查 Cookie JWT；通過後 req.user.id 才有值
import { authenticate } from "../middlewares/authenticate.js";

// 建立本檔路由器；路徑前綴由 index 掛 /api/payment-success-rewards
const router: Router = Router();

// =============================================================================
// 【可調參數】M 幣回饋 — 依「實付 final_amount」加到「當下剩餘」
// =============================================================================
const M_COIN_REWARD = {
  /**
   * 回饋倍率：實付 × rate = 本次要加的 M 幣
   * 例：rate=1、final_amount=950 → 加 950
   *     rate=0.01 → 付 100 加 1
   */
  rate: 1,
  /** 最少回饋（0 = 允許加 0） */
  minEarn: 0,
  /** 算完後再固定加碼（活動用） */
  flatBonus: 0,
  /** 小數：floor | round | ceil */
  rounding: "round" as "floor" | "round" | "ceil",
};

// =============================================================================
// 【可調參數】優惠券核銷
// =============================================================================
const COUPON_REDEEM = {
  /** true = 把本單 coupon_id 對應的 member_coupons 標 is_used=1 */
  markUsed: true,
  /** 建單時可能已標過 used；true = 仍回 success */
  okIfAlreadyUsed: true,
};

// =============================================================================
// 【可調參數】累積消費 + 會員等級（與 api-member-level 門檻一致）
// =============================================================================
type MemberLevel = "銅" | "銀" | "金";

const MEMBER_LEVEL = {
  /** false = 只做券 + M 幣，不動 total_* / level */
  enabled: true,
  /**
   * 累加到 total_spent 的金額來源
   * final_amount = 實付（建議）；original_amount = 原價
   */
  spendField: "final_amount" as "final_amount" | "original_amount",
  /** 每處理一筆成功回調，total_orders +N（通常 1） */
  orderCountDelta: 1,
  order: ["銅", "銀", "金"] as MemberLevel[],
  /**
   * 升等：minOrders **或** minSpent 達其一即可
   * 銅→銀：3 筆或 5000；銀→金：6 筆或 15000
   */
  thresholds: {
    銅: { minOrders: 0, minSpent: 0 },
    銀: { minOrders: 3, minSpent: 5000 },
    金: { minOrders: 6, minSpent: 15000 },
  } as Record<MemberLevel, { minOrders: number; minSpent: number }>,
  /** true = 只升不降 */
  onlyUpgrade: true,
};

// ---------- 型別：SQL 列形狀 ----------
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

/**
 * =============================================================================
 * 【函式】calcMCoinFromFinalAmount
 * =============================================================================
 * 用途：依本單「實付」算這次要加進 current_points 的數量
 * 例：final_amount=950、rate=1 → amount=950
 * 注意：不是重設餘額，是「加在當下剩餘上」
 * =============================================================================
 */
function calcMCoinFromFinalAmount(order: OrderRewardRow): {
  amount: number;
  detail: string;
} {
  // Number(...) || 0：轉數字；NaN 當 0
  // Math.max(0, x)：不讓實付變負數
  const finalAmount = Math.max(0, Number(order.final_amount) || 0);
  const raw = finalAmount * M_COIN_REWARD.rate;

  // switch：依 rounding 選進位方式
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

  // 下限 minEarn + 加碼 flatBonus
  const amount = Math.max(
    0,
    Math.max(M_COIN_REWARD.minEarn, base) + M_COIN_REWARD.flatBonus,
  );
  return {
    amount,
    detail: `實付 final_amount=${finalAmount} × rate=${M_COIN_REWARD.rate} → 回饋 ${amount}（加到當下餘額）`,
  };
}

/** DB 等級字串 → 合法 enum */
function normalizeLevel(raw: string | null | undefined): MemberLevel {
  if (raw === "銀" || raw === "金" || raw === "銅") return raw;
  return "銅";
}

/** 等級在 order 陣列的位置（越大越高） */
function levelRank(level: MemberLevel): number {
  return MEMBER_LEVEL.order.indexOf(level);
}

/**
 * =============================================================================
 * 【函式】resolveLevelByStats
 * =============================================================================
 * 用途：用累積訂單數／消費金額，由高到低判定應屬等級
 * 規則：金／銀 的 minOrders **或** minSpent 其一達標即可
 * =============================================================================
 */
function resolveLevelByStats(
  totalOrders: number,
  totalSpent: number,
): { level: MemberLevel; detail: string } {
  const gold = MEMBER_LEVEL.thresholds.金;
  const silver = MEMBER_LEVEL.thresholds.銀;

  // ||：邏輯或，一邊 true 就升該級
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

/** 本單要累加進 total_spent 的金額 */
function calcSpendDelta(order: OrderRewardRow): number {
  if (MEMBER_LEVEL.spendField === "original_amount") {
    return Math.max(0, Number(order.original_amount) || 0);
  }
  return Math.max(0, Number(order.final_amount) || 0);
}

/**
 * onlyUpgrade=true 時：新等級若比現在低則維持原等級
 * 三元：條件 ? 真值 : 假值
 */
function applyLevelPolicy(
  current: MemberLevel,
  computed: MemberLevel,
): MemberLevel {
  if (!MEMBER_LEVEL.onlyUpgrade) return computed;
  return levelRank(computed) > levelRank(current) ? computed : current;
}

/**
 * =============================================================================
 * 【函式】ensureRewardsLogTable
 * =============================================================================
 * 用途：建立「同單防重」表（沒有才建）
 * CREATE TABLE IF NOT EXISTS：已存在不報錯
 * PRIMARY KEY (order_id)：同一訂單只能有一筆 log → 不能重複發獎
 * =============================================================================
 */
async function ensureRewardsLogTable(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS payment_success_rewards_log (
      order_id VARCHAR(20) NOT NULL,
      member_id INT NOT NULL,
      m_coin_granted INT NOT NULL DEFAULT 0,
      spend_delta INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// =============================================================================
// 【主要路由】POST /
// 完整：POST /api/payment-success-rewards
// 中介層：authenticate（要登入）
// body：{ order_id?: string }  建議帶建單回傳的 order_id
// =============================================================================
router.post("/", authenticate, async (req: Request, res: Response) => {
  // req.user?.id：可選鏈，沒登入時 user 可能 undefined
  const memberId = req.user?.id;
  if (!memberId) {
    res.status(401).json({ success: false, message: "請先登入" });
    return; // 結束，避免繼續寫 res
  }

  // 支援 order_id 或 orderId 兩種 body 欄名
  const rawOrderId =
    typeof req.body?.order_id === "string"
      ? req.body.order_id.trim()
      : typeof req.body?.orderId === "string"
        ? req.body.orderId.trim()
        : "";

  // getConnection：專用連線，才能 beginTransaction / commit / rollback
  const connection = await pool.getConnection();

  try {
    // 交易：中間失敗可整批還原
    await connection.beginTransaction();
    await ensureRewardsLogTable(connection);

    // ---------- 1) 鎖定本單 FOR UPDATE（避免兩請求同時處理）----------
    let order: OrderRewardRow | undefined;

    if (rawOrderId) {
      // 有帶 order_id：精準鎖定該單且必須是本人
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
      // 解構 [rows]：mysql2 回傳 [資料列陣列, 欄位資訊]
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
      // 沒帶 order_id：權宜取最近一筆（綠界若沒回傳編號時）
      // 上線建議一定要帶 order_id，避免抓錯單
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
    // coupon_id 可能 null 或 0 → 當沒有用券
    const couponId =
      order.coupon_id == null || order.coupon_id === 0
        ? null
        : Number(order.coupon_id);

    // ---------- 2) 同單是否已處理（log 表有列 = 已發過獎）----------
    const [logRows] = await connection.query<RowDataPacket[]>(
      `SELECT order_id, m_coin_granted FROM payment_success_rewards_log WHERE order_id = ? LIMIT 1 FOR UPDATE`,
      [orderId],
    );
    // Boolean(x)：有資料為 true
    const alreadyApplied = Boolean(logRows[0]);

    // ---------- 3) 優惠券 → is_used=1（建單可能已標過，可重入）----------
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
      // 找一張「尚未使用」的持有紀錄
      const [unusedRows] = await connection.query<
        (RowDataPacket & { id: number })[]
      >(
        `
          SELECT id
          FROM member_coupons
          WHERE member_id = ? AND coupon_id = ? AND is_used = 0
          ORDER BY received_at ASC
          LIMIT 1
          FOR UPDATE
        `,
        [memberId, couponId],
      );

      if (unusedRows[0]) {
        // 核銷：is_used=1、寫 used_at
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
        // 可能 checkout 已標 used：查已用過的供回傳
        const [usedRows] = await connection.query<
          (RowDataPacket & { id: number })[]
        >(
          `
            SELECT id FROM member_coupons
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
      }
    }

    // ---------- 4) 鎖定會員列：讀「結帳後剩餘」再加回饋 ----------
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

    /**
     * M 幣核心公式：
     *   pointsBefore = 當下 current_points（結帳已扣折抵，例 750）
     *   grantAmount  = 實付回饋（例 950）；若本單已處理過則 0
     *   pointsAfter  = pointsBefore + grantAmount（例 1700）
     */
    const pointsBefore = Number(memberRow.current_points) || 0;
    const mCoin = calcMCoinFromFinalAmount(order);
    const grantAmount = alreadyApplied ? 0 : mCoin.amount;
    const pointsAfter = pointsBefore + grantAmount;

    const levelBefore = normalizeLevel(memberRow.member_level);
    const spentBefore = Number(memberRow.total_spent) || 0;
    const ordersBefore = Number(memberRow.total_orders) || 0;

    let spendDelta = 0;
    let ordersDelta = 0;
    let spentAfter = spentBefore;
    let ordersAfter = ordersBefore;
    let levelComputed: MemberLevel = levelBefore;
    let levelAfter = levelBefore;
    let levelDetail = alreadyApplied ? "already_applied" : "skipped";

    // 僅「第一次處理本單」才累加消費／訂單／升等
    if (!alreadyApplied && MEMBER_LEVEL.enabled) {
      spendDelta = calcSpendDelta(order);
      ordersDelta = Math.max(0, MEMBER_LEVEL.orderCountDelta);
      spentAfter = spentBefore + spendDelta;
      ordersAfter = ordersBefore + ordersDelta;

      const resolved = resolveLevelByStats(ordersAfter, spentAfter);
      levelComputed = resolved.level;
      levelAfter = applyLevelPolicy(levelBefore, levelComputed);
      levelDetail = resolved.detail;
      if (levelAfter !== levelBefore) {
        levelDetail += ` | ${levelBefore} → ${levelAfter}`;
      }
    }

    if (!alreadyApplied) {
      /**
       * INSERT IGNORE：order_id 已存在則 affectedRows=0（不丟錯）
       * 用來擋並發雙重請求
       */
      const [ins] = await connection.query<ResultSetHeader>(
        `
          INSERT IGNORE INTO payment_success_rewards_log
            (order_id, member_id, m_coin_granted, spend_delta)
          VALUES (?, ?, ?, ?)
        `,
        [orderId, memberId, grantAmount, spendDelta],
      );

      if (ins.affectedRows === 0) {
        // 別的請求搶先處理完了
        await connection.rollback();
        const [bal] = await connection.query<MemberStatRow[]>(
          `SELECT current_points FROM member WHERE id = ? LIMIT 1`,
          [memberId],
        );
        res.json({
          success: true,
          message: "此訂單已處理過",
          data: {
            order_id: orderId,
            already_applied: true,
            m_coin: {
              granted: 0,
              balance_before: Number(bal[0]?.current_points) || 0,
              balance_after: Number(bal[0]?.current_points) || 0,
              detail: "already_applied",
            },
          },
        });
        return;
      }

      /**
       * 寫回 member：
       *   current_points = 剩餘 + 實付回饋
       *   total_spent / total_orders / member_level
       * 刻意不碰 order_status
       */
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

      // 同步 order.points_earned = 實際發放量（benefits 流水用）
      await connection.query(
        `
          UPDATE order_main
          SET points_earned = ?
          WHERE id = ? AND member_id = ?
        `,
        [grantAmount, orderId, memberId],
      );
    }

    // 交易成功提交
    await connection.commit();

    res.json({
      success: true,
      message: alreadyApplied ? "此訂單已處理過" : "處理完成",
      data: {
        order_id: orderId,
        already_applied: alreadyApplied,
        coupon,
        /**
         * m_coin 回傳給前端對帳用：
         *   balance_before → 結帳扣點後剩餘（例 750）
         *   granted        → 本單實付回饋（例 950）
         *   balance_after  → before + granted（例 1700）
         *   final_amount   → 本單實付
         */
        m_coin: {
          granted: alreadyApplied
            ? Number(logRows[0]?.m_coin_granted) || 0
            : grantAmount,
          source: "final_amount * rate",
          detail: alreadyApplied
            ? "already_applied（不重複加點）"
            : mCoin.detail,
          balance_before: pointsBefore,
          balance_after: alreadyApplied ? pointsBefore : pointsAfter,
          final_amount: Number(order.final_amount) || 0,
          config_snapshot: {
            rate: M_COIN_REWARD.rate,
            minEarn: M_COIN_REWARD.minEarn,
            flatBonus: M_COIN_REWARD.flatBonus,
            rounding: M_COIN_REWARD.rounding,
          },
        },
        member_progress: {
          enabled: MEMBER_LEVEL.enabled,
          spend_delta: alreadyApplied ? 0 : spendDelta,
          total_spent_before: spentBefore,
          total_spent_after: alreadyApplied ? spentBefore : spentAfter,
          orders_delta: alreadyApplied ? 0 : ordersDelta,
          total_orders_before: ordersBefore,
          total_orders_after: alreadyApplied ? ordersBefore : ordersAfter,
          level_before: levelBefore,
          level_after: alreadyApplied ? levelBefore : levelAfter,
          level_changed: !alreadyApplied && levelBefore !== levelAfter,
          detail: levelDetail,
          thresholds: MEMBER_LEVEL.thresholds,
        },
      },
    });
  } catch (error) {
    // 任何未預期錯誤：整筆交易還原
    await connection.rollback();
    console.error("[POST /api/payment-success-rewards]", error);
    res.status(500).json({
      success: false,
      message: "處理失敗",
    });
  } finally {
    // 無論成功失敗都要還連線給 pool
    connection.release();
  }
});

// 給 index.ts：import ... from "./routes/api-payment-success-rewards.js"
export default router;
