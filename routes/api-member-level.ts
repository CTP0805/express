/**
 * 會員等級 API（對齊 member.member_level enum：'銅' | '銀' | '金'）
 *
 * 掛載：app.use("/api/member-level", apiMemberLevelRouter)
 * （獨立檔案，不修改既有 api-member.ts）
 *
 * GET /api/member-level
 *   回傳目前等級、下一級、進度、剩餘訂單／消費、權益表
 *
 * 升等依據（業務規則，寫在後端常數）：
 * - 銅 → 銀：total_orders >= 3 或 total_spent >= 5000
 * - 銀 → 金：total_orders >= 6 或 total_spent >= 15000
 * （實際等級以 DB member_level 為準；進度以 total_orders / total_spent 計算）
 */
import { type Request, type Response, Router } from "express";
import type { RowDataPacket } from "mysql2";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js";

const router: Router = Router();

export type MemberLevel = "銅" | "銀" | "金";

const LEVEL_ORDER: MemberLevel[] = ["銅", "銀", "金"];

/** 升到該等級所需門檻（進入此等級的最低條件） */
const LEVEL_THRESHOLDS: Record<
  MemberLevel,
  { minOrders: number; minSpent: number }
> = {
  銅: { minOrders: 0, minSpent: 0 },
  銀: { minOrders: 3, minSpent: 5000 },
  金: { minOrders: 6, minSpent: 15000 },
};

const BENEFIT_ROWS = [
  {
    label: "大使權益",
    values: {
      銅: "1倍 (最高回饋1%)",
      銀: "3倍 (最高回饋3%)",
      金: "5倍 (最高回饋5%)",
    },
  },
  {
    label: "會員日",
    values: {
      銅: "TWD 50 基礎會員日",
      銀: "TWD 150 進階會員日",
      金: "TWD 300 尊榮會員日",
    },
  },
  {
    label: "會員價",
    values: { 銅: "-", 銀: "銀級價", 金: "金級價" },
  },
  {
    label: "升等禮",
    values: { 銅: "-", 銀: "TWD 200 升等禮", 金: "TWD 500 升等禮" },
  },
  {
    label: "續會禮",
    values: { 銅: "-", 銀: "TWD 200 續會禮", 金: "TWD 500 續會禮" },
  },
];

type MemberLevelRow = RowDataPacket & {
  member_level: string;
  total_spent: number;
  total_orders: number;
  current_points: number;
  name: string;
};

function normalizeLevel(raw: string | null | undefined): MemberLevel {
  if (raw === "銀" || raw === "金" || raw === "銅") return raw;
  return "銅";
}

function nextLevelOf(level: MemberLevel): MemberLevel | null {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1] ?? null;
}

/**
 * 以 total_orders / total_spent 計算往下一級的進度（0–100）
 * 取「訂單進度」與「消費進度」較高者
 */
function calcProgress(
  current: MemberLevel,
  totalOrders: number,
  totalSpent: number,
): {
  progressPercent: number;
  remainingOrders: number;
  remainingSpend: number;
  next: MemberLevel | null;
} {
  const next = nextLevelOf(current);
  if (!next) {
    return {
      progressPercent: 100,
      remainingOrders: 0,
      remainingSpend: 0,
      next: null,
    };
  }

  const curTh = LEVEL_THRESHOLDS[current];
  const nextTh = LEVEL_THRESHOLDS[next];

  const orderSpan = Math.max(1, nextTh.minOrders - curTh.minOrders);
  const spentSpan = Math.max(1, nextTh.minSpent - curTh.minSpent);

  const orderProgress = Math.min(
    1,
    Math.max(0, (totalOrders - curTh.minOrders) / orderSpan),
  );
  const spentProgress = Math.min(
    1,
    Math.max(0, (totalSpent - curTh.minSpent) / spentSpan),
  );

  const best = Math.max(orderProgress, spentProgress);
  const remainingOrders = Math.max(0, nextTh.minOrders - totalOrders);
  const remainingSpend = Math.max(0, nextTh.minSpent - totalSpent);

  return {
    progressPercent: Math.round(best * 100),
    remainingOrders,
    remainingSpend,
    next,
  };
}

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const memberId = req.user!.id;

    const [rows] = await pool.query<MemberLevelRow[]>(
      `
        SELECT name, member_level, total_spent, total_orders, current_points
        FROM member
        WHERE id = ?
        LIMIT 1
      `,
      [memberId],
    );

    const member = rows[0];
    if (!member) {
      res.status(404).json({ success: false, message: "找不到會員資料" });
      return;
    }

    const currentLevel = normalizeLevel(member.member_level);
    const totalOrders = Number(member.total_orders) || 0;
    const totalSpent = Number(member.total_spent) || 0;
    const progress = calcProgress(currentLevel, totalOrders, totalSpent);

    res.status(200).json({
      success: true,
      message: "會員等級資料取得成功",
      data: {
        name: member.name,
        current_level: currentLevel,
        next_level: progress.next,
        progress_percent: progress.progressPercent,
        remaining_orders: progress.remainingOrders,
        remaining_spend: progress.remainingSpend,
        total_orders: totalOrders,
        total_spent: totalSpent,
        current_points: Number(member.current_points) || 0,
        levels: LEVEL_ORDER,
        benefit_rows: BENEFIT_ROWS,
        thresholds: LEVEL_THRESHOLDS,
        faqs: [
          {
            q: "會員分級有哪些？",
            a: "本平台會員分為銅、銀、金三個等級，依消費與完成訂單數給予不同權益。",
          },
          {
            q: "如何加入會員權益？",
            a: "註冊帳號後自動成為銅級會員。累積消費或完成體驗預訂即可自動升等，無需額外申請。",
          },
          {
            q: "如何升等？",
            a: "銅→銀：完成至少 3 筆訂單或累積消費 NT$5,000；銀→金：完成至少 6 筆訂單或累積消費 NT$15,000。",
          },
          {
            q: "哪裡可以查詢會員資格？",
            a: "於個人檔案 > 會員等級 頁面，即可查看當前等級、進度條與剩餘升等條件。",
          },
        ],
      },
    });
  } catch (error) {
    console.error("[GET /api/member-level]", error);
    res.status(500).json({ success: false, message: "取得會員等級失敗" });
  }
});

export default router;
