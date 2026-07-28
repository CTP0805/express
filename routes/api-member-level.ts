/**
 * =============================================================================
 * 【新手導讀】會員等級後端 API
 * =============================================================================
 * 檔案：express/routes/api-member-level.ts
 * 掛載：express/index.ts → app.use("/api/member-level", apiMemberLevelRouter)
 * 完整網址：GET /api/member-level
 * 前端對應：next/app/member/level/api.ts → fetchMemberLevel()
 *
 * 本檔只負責從 member 資料表 SELECT 並整理前端顯示資料，不修改會員資料。
 * =============================================================================
 */

// ---------- import：從哪來、幹嘛用 ----------

// express 框架
//   Router：建立「子路由表」，最後 export 給 index 掛載
//   Request / Response：HTTP 請求、回應的 TypeScript 型別
//   type 關鍵字：只引入型別，執行時不存在
import { type Request, type Response, Router } from "express";

// mysql2：MySQL 驅動的型別
//   RowDataPacket：查詢結果「一列」的型別標記
import type { RowDataPacket } from "mysql2";

// 專案自己的 DB 連線池（../ = 上一層目錄）
//   pool.query(sql, 參數) → 執行 SQL
//   .js 副檔名：因為編譯/執行時 ESM 需要（TS 原始檔是 .ts）
import pool from "../utils/connect-mysql.js";

// 登入中介層：檢查 Cookie JWT，通過才把 req.user 填上
//   用法：router.get("/", authenticate, handler)
import { authenticate } from "../middlewares/authenticate.js";

// const router = Router()
//   建立路由器實例；下面 router.get / post 都掛在這
const router: Router = Router();

// export type：別的檔案也能 import type { MemberLevel }
export type MemberLevel = "啟程旅人" | "探索旅人" | "環遊旅人";

// 陣列：等級由低到高，用 index 算「下一級」
const LEVEL_ORDER: MemberLevel[] = ["啟程旅人", "探索旅人", "環遊旅人"];

/**
 * Record<鍵型別, 值型別>：物件對應表
 * 進入該等級的門檻（與前端 thresholds 一致）
 */
const LEVEL_THRESHOLDS: Record<
  MemberLevel,
  { minOrders: number; minSpent: number }
> = {
  啟程旅人: { minOrders: 0, minSpent: 0 },
  探索旅人: { minOrders: 3, minSpent: 5000 },
  環遊旅人: { minOrders: 6, minSpent: 15000 },
};

// 卡面主題由後端依資料庫等級決定，前端只套用回傳色碼。
const LEVEL_CARD_THEMES: Record<
  MemberLevel,
  { start: string; middle: string; end: string }
> = {
  啟程旅人: {
    start: "#2DD4BF",
    middle: "#22D3EE",
    end: "#38BDF8",
  },
  探索旅人: {
    start: "#818CF8",
    middle: "#A78BFA",
    end: "#C084FC",
  },
  環遊旅人: {
    start: "#FDE047",
    middle: "#FBBF24",
    end: "#FB7185",
  },
};

// 純展示用權益列（不是 SQL 撈的）
const BENEFIT_ROWS = [
  {
    label: "大使權益",
    values: {
      啟程旅人: "1倍 (最高回饋1%)",
      探索旅人: "3倍 (最高回饋3%)",
      環遊旅人: "5倍 (最高回饋5%)",
    },
  },
  {
    label: "會員日",
    values: {
      啟程旅人: "TWD 50 基礎會員日",
      探索旅人: "TWD 150 進階會員日",
      環遊旅人: "TWD 300 尊榮會員日",
    },
  },
  {
    label: "會員價",
    values: {
      啟程旅人: "-",
      探索旅人: "探索旅人價",
      環遊旅人: "環遊旅人價",
    },
  },
  {
    label: "升等禮",
    values: {
      啟程旅人: "-",
      探索旅人: "TWD 200 升等禮",
      環遊旅人: "TWD 500 升等禮",
    },
  },
  {
    label: "續會禮",
    values: {
      啟程旅人: "-",
      探索旅人: "TWD 200 續會禮",
      環遊旅人: "TWD 500 續會禮",
    },
  },
];

/**
 * type A = B & C
 *   交叉型別：同時具備 B 與 C 的欄位
 *   RowDataPacket & { ... } = MySQL 列 + 我們關心的欄位
 */
type MemberLevelRow = RowDataPacket & {
  member_level: MemberLevel;
  total_spent: number;
  total_orders: number;
  current_points: number;
  name: string;
};

/**
 * 【函式】nextLevelOf
 * 用途：目前等級的「下一級」；最高等級沒有下一級 → null
 * LEVEL_ORDER.indexOf：找到在陣列的位置（找不到是 -1）
 */
function nextLevelOf(level: MemberLevel): MemberLevel | null {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return null;
  // ?? null：左邊是 null/undefined 時用右邊（這裡防呆）
  return LEVEL_ORDER[idx + 1] ?? null;
}

/**
 * 【函式】calcProgress
 * 用途：算進度條 %、還差幾單／多少錢
 * Math.max / Math.min：取大／取小，用來把比例夾在 0~1
 * Math.round：四捨五入成整數百分比
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
    // 已是最高等
    return {
      progressPercent: 100,
      remainingOrders: 0,
      remainingSpend: 0,
      next: null,
    };
  }

  const curTh = LEVEL_THRESHOLDS[current];
  const nextTh = LEVEL_THRESHOLDS[next];

  // 區間長度至少 1，避免除以 0
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

  // 訂單進度、消費進度取較高者當條
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

// =============================================================================
// 【主要路由】GET /
// 完整路徑：GET /api/member-level
// 中介層：authenticate（要先登入）
// async (req, res) => {}：非同步處理函式
// =============================================================================
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    // authenticate 已從登入 Cookie 驗證 JWT，並把登入者放進 req.user。
    // 前端不傳 memberId，避免使用者竄改 ID 查詢別人的會員資料。
    const memberId = req.user?.id;
    if (!memberId) {
      res.status(401).json({ success: false, message: "尚未登入" });
      return;
    }

    /**
     * pool.query<型別[]>(sql, [參數])
     *   ? 佔位符：防止 SQL 注入，參數依序代入
     *   回傳 [rows, fields]，我們只要 rows → 解構 const [rows] = ...
     * SQL：
     *   SELECT 欄位 FROM 表 WHERE 條件 LIMIT 1
     */
    const [rows] = await pool.query<MemberLevelRow[]>(
      `
        SELECT name, member_level, total_spent, total_orders, current_points
        FROM member
        WHERE id = ?
        LIMIT 1
      `,
      [memberId],
    );

    // 陣列第一筆；沒資料則 undefined
    const member = rows[0];
    if (!member) {
      // res.status(404).json(...)：HTTP 狀態 + JSON body
      res.status(404).json({ success: false, message: "找不到會員資料" });
      return; // 結束函式，避免繼續寫第二次 res
    }

    // member_level 直接採用 SELECT 回來的 ENUM 值，不在 API 內改寫。
    const currentLevel = member.member_level;
    // Number(x) || 0：轉數字；若是 NaN/0 則用 0（注意：真的 0 也會變 0）
    const totalOrders = Number(member.total_orders) || 0;
    const totalSpent = Number(member.total_spent) || 0;
    const progress = calcProgress(currentLevel, totalOrders, totalSpent);

    // 下一級門檻：前端畫「已完成 0/3」「已消費 0/5,000」
    // 升等：訂單達標 **或** 消費達標（完成其一即可）
    const nextGoal = progress.next
      ? LEVEL_THRESHOLDS[progress.next]
      : null;

    // 成功回應：前端 ApiEnvelope + MemberLevelPayload
    res.status(200).json({
      success: true,
      message: "會員等級資料取得成功",
      data: {
        name: member.name,
        member_level: member.member_level,
        next_level: progress.next,
        progress_percent: progress.progressPercent,
        remaining_orders: progress.remainingOrders,
        remaining_spend: progress.remainingSpend,
        // DB 累積（付款成功 rewards 會更新 total_orders / total_spent）
        total_orders: totalOrders,
        total_spent: totalSpent,
        // 下一級目標（啟程→探索 3／5000；探索→環遊 6／15000）
        goal_orders: nextGoal?.minOrders ?? null,
        goal_spent: nextGoal?.minSpent ?? null,
        upgrade_rule: "either" as const,
        current_points: Number(member.current_points) || 0,
        card_theme: LEVEL_CARD_THEMES[member.member_level],
        levels: LEVEL_ORDER,
        benefit_rows: BENEFIT_ROWS,
        thresholds: LEVEL_THRESHOLDS,
        faqs: [
          {
            q: "會員分級有哪些？",
            a: "本平台會員分為啟程旅人、探索旅人、環遊旅人三個等級，依消費與完成訂單數給予不同權益。",
          },
          {
            q: "如何加入會員權益？",
            a: "註冊帳號後自動成為啟程旅人。累積消費或完成體驗預訂即可自動升等，無需額外申請。",
          },
          {
            q: "如何升等？",
            a: "完成其一即可：啟程旅人→探索旅人需「已完成 3 筆訂單」或「累積消費 NT$5,000」；探索旅人→環遊旅人需「6 筆」或「NT$15,000」。",
          },
          {
            q: "哪裡可以查詢會員資格？",
            a: "於個人檔案 > 會員等級 可查看已完成 X/3 筆訂單、已消費 Y/5,000 等進度。",
          },
        ],
      },
    });
  } catch (error) {
    // 任何未預期錯誤：記 log + 500
    console.error("[GET /api/member-level]", error);
    res.status(500).json({ success: false, message: "取得會員等級失敗" });
  }
});

// 給 index.ts：import xxx from "./routes/api-member-level.js"
export default router;
