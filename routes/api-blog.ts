/**
 * =============================================================================
 * 【新手導讀】部落格後端 API（你的負責範圍：Blog）
 * =============================================================================
 * 這支檔案做什麼？
 *   瀏覽器（Next 前端）用 fetch 打這裡，這裡再查 MySQL 的 posts 表，回 JSON。
 *
 * 誰掛載它？
 *   express/index.ts → app.use("/api/blog", apiBlogRouter)
 *   所以下面 router.get("/") 實際網址是 GET http://localhost:3001/api/blog
 *
 * 常見流程（前後端對照）：
 *   列表頁 blog/page.tsx        → GET  /api/blog
 *   管理頁 blog/manage          → GET  /api/blog/mine
 *   新增頁 blog/new             → POST /api/blog（通常先選 eligible-orders）
 *   編輯頁 blog/[slug]/edit    → PUT  /api/blog/:id
 *   審核頁 blog/review          → GET pending-review + POST :id/review
 *   上傳封面                    → POST /api/blog/upload（另一支檔 api-blog-upload.ts）
 *
 * 資料表：posts（可能還有 order_id / order_title / review_note 擴充欄）
 * 需執行：express/databases/wang-blog-order-review.sql
 *
 * 名詞小抄：
 *   authenticate = 中介層，檢查 Cookie 裡的登入 token，通過才有 req.user
 *   res.json(...) = 把物件變成 JSON 字串回給前端
 *   slug = 網址用的文章代稱（比用數字 id 好讀）
 * =============================================================================
 *
 * 路由一覽：
 * GET    /api/blog                 公開列表（預設已上架；可 query status）
 * GET    /api/blog/mine            我的文章（需登入）
 * GET    /api/blog/pending-review  待審核佇列（管理者）
 * GET    /api/blog/eligible-orders 可撰寫的已完成訂單（需登入）
 * GET    /api/blog/slug/:slug      已上架單篇
 * GET    /api/blog/:id             單篇
 * POST   /api/blog                 新增（會員綁 order_id）
 * PUT    /api/blog/:id             更新（僅作者內容；管理者不可改內容）
 * POST   /api/blog/:id/review      管理者通過／駁回 + 註解
 * DELETE /api/blog/:id             刪除（僅作者）
 */
import { type Request, type Response, Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js";
import {
  persistHtmlDataImages,
  persistSingleImageField,
} from "../utils/blog-content-images.js";

const router: Router = Router();

// ---------- 常數：標題長度、允許的文章狀態（和前端 types 要對齊）----------
const TITLE_MAX = 20;
const ALLOWED_STATUS = new Set([
  "draft", // 草稿
  "pending_review", // 送審中
  "published", // 已上架（公開列表看得到）
  "rejected", // 審核退回
]);

type PostRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  content_image: string | null;
  status: string;
  published_at: Date | string | null;
  updated_at: Date | string;
  created_at: Date | string;
  author_id: number;
  category_id: number | null;
  order_id?: string | null;
  order_title?: string | null;
  review_note?: string | null;
  author_name?: string | null;
};

type RoleRow = RowDataPacket & { role: string };

/** 舊 DB 一定有的欄位（保證列表可顯示） */
const POST_SELECT_BASE = `
  id, title, slug, content, excerpt, cover_image, content_image,
  status, published_at, updated_at, created_at, author_id, category_id
`;

/** 擴充欄位快取：使用者可能只加 review_note、或完整 order_* */
const postColumnCache: Record<string, boolean | null> = {
  order_id: null,
  order_title: null,
  review_note: null,
};

async function postsHasColumn(column: string): Promise<boolean> {
  if (postColumnCache[column] !== null && postColumnCache[column] !== undefined) {
    return Boolean(postColumnCache[column]);
  }
  try {
    const [cols] = await pool.query<RowDataPacket[]>(
      `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'posts'
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [column],
    );
    postColumnCache[column] = cols.length > 0;
  } catch {
    try {
      await pool.query(`SELECT \`${column}\` FROM posts LIMIT 0`);
      postColumnCache[column] = true;
    } catch {
      postColumnCache[column] = false;
    }
  }
  return Boolean(postColumnCache[column]);
}

async function postsHaveOrderColumns(): Promise<boolean> {
  return postsHasColumn("order_id");
}

async function postsHaveReviewNote(): Promise<boolean> {
  return postsHasColumn("review_note");
}

/** 依實際存在的欄位組 SELECT（修正：只加 review_note 也能讀退回原因） */
async function getPostSelect(): Promise<string> {
  const extras: string[] = [];
  if (await postsHasColumn("order_id")) extras.push("order_id");
  if (await postsHasColumn("order_title")) extras.push("order_title");
  if (await postsHasColumn("review_note")) extras.push("review_note");
  if (extras.length === 0) return POST_SELECT_BASE;
  return `${POST_SELECT_BASE},
  ${extras.join(", ")}
`;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function mapPost(row: PostRow) {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt ?? null,
    cover_image: row.cover_image ?? null,
    content_image: row.content_image ?? null,
    status: row.status,
    published_at: toIso(row.published_at),
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    author_id: Number(row.author_id),
    category_id: row.category_id == null ? null : Number(row.category_id),
    order_id: row.order_id ?? null,
    order_title: row.order_title ?? null,
    review_note: row.review_note ?? null,
    author_name: row.author_name ?? null,
  };
}

function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (base) return base.slice(0, 200);
  return `post-${Date.now()}`;
}

async function ensureUniqueSlug(
  desired: string,
  excludeId?: number,
): Promise<string> {
  let slug = desired || `post-${Date.now()}`;
  let n = 2;
  for (;;) {
    const [rows] = await pool.query<RowDataPacket[]>(
      excludeId
        ? `SELECT id FROM posts WHERE slug = ? AND id <> ? LIMIT 1`
        : `SELECT id FROM posts WHERE slug = ? LIMIT 1`,
      excludeId ? [slug, excludeId] : [slug],
    );
    if (!rows.length) return slug;
    slug = `${desired}-${n}`;
    n += 1;
  }
}

function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t : null;
}

async function getMemberRole(memberId: number): Promise<string> {
  const [rows] = await pool.query<RoleRow[]>(
    `SELECT role FROM member WHERE id = ? LIMIT 1`,
    [memberId],
  );
  return String(rows[0]?.role ?? "會員");
}

function isAdminRole(role: string): boolean {
  return role === "管理者";
}

// =============================================================================
// 【區塊】公開文章列表 GET /
// 誰用：next/app/blog/page.tsx → fetchBlogPosts()
// 做什麼：從 posts 撈文章；預設只給 status=published 的
// 新手：req.query 是網址 ?status=xxx 這種參數；不需登入
// =============================================================================
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, category_id, mine } = req.query;
    const clauses: string[] = [];
    const params: unknown[] = [];

    // 預設前台只看已上架（除非明確指定 status）
    if (typeof status === "string" && status.trim()) {
      clauses.push("status = ?");
      params.push(status.trim());
    } else if (mine !== "1") {
      clauses.push("status = ?");
      params.push("published");
    }

    if (category_id != null && String(category_id).trim() !== "") {
      clauses.push("category_id = ?");
      params.push(Number(category_id));
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const select = await getPostSelect();
    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT ${select}
        FROM posts
        ${where}
        ORDER BY
          CASE WHEN published_at IS NULL THEN 1 ELSE 0 END,
          published_at DESC,
          updated_at DESC
      `,
      params,
    );

    res.status(200).json({
      success: true,
      message: "文章列表取得成功",
      posts: rows.map(mapPost),
    });
  } catch (error) {
    console.error("[GET /api/blog]", error);
    // 最後手段：只用基礎欄位再試一次（保證前台列表可顯示）
    try {
      postColumnCache.order_id = false;
      postColumnCache.order_title = false;
      postColumnCache.review_note = false;
      const [rows] = await pool.query<PostRow[]>(
        `
          SELECT ${POST_SELECT_BASE}
          FROM posts
          WHERE status = ?
          ORDER BY
            CASE WHEN published_at IS NULL THEN 1 ELSE 0 END,
            published_at DESC,
            updated_at DESC
        `,
        ["published"],
      );
      res.status(200).json({
        success: true,
        message: "文章列表取得成功",
        posts: rows.map(mapPost),
      });
    } catch (fallbackError) {
      console.error("[GET /api/blog fallback]", fallbackError);
      res.status(500).json({ success: false, message: "讀取文章失敗" });
    }
  }
});

// =============================================================================
// 【區塊】我的文章 GET /mine
// 誰用：管理頁 blog/manage
// 做什麼：只撈 author_id = 目前登入者 的文章（含草稿／退回）
// 新手：authenticate 寫在路徑後面 → 沒登入會 401，有登入才進函式
// =============================================================================
router.get("/mine", authenticate, async (req: Request, res: Response) => {
  try {
    const memberId = req.user!.id;
    const select = await getPostSelect();
    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT ${select}
        FROM posts
        WHERE author_id = ?
        ORDER BY updated_at DESC
      `,
      [memberId],
    );
    res.status(200).json({
      success: true,
      message: "我的文章取得成功",
      posts: rows.map(mapPost),
    });
  } catch (error) {
    console.error("[GET /api/blog/mine]", error);
    try {
      postColumnCache.order_id = false;
      postColumnCache.order_title = false;
      // review_note 若存在仍應讀取
      const memberId = req.user!.id;
      const select = await getPostSelect().catch(() => POST_SELECT_BASE);
      const [rows] = await pool.query<PostRow[]>(
        `
          SELECT ${select}
          FROM posts
          WHERE author_id = ?
          ORDER BY updated_at DESC
        `,
        [memberId],
      );
      res.status(200).json({
        success: true,
        message: "我的文章取得成功",
        posts: rows.map(mapPost),
      });
    } catch (fallbackError) {
      console.error("[GET /api/blog/mine fallback]", fallbackError);
      try {
        const memberId = req.user!.id;
        const [rows] = await pool.query<PostRow[]>(
          `
            SELECT ${POST_SELECT_BASE}
            FROM posts
            WHERE author_id = ?
            ORDER BY updated_at DESC
          `,
          [memberId],
        );
        res.status(200).json({
          success: true,
          message: "我的文章取得成功",
          posts: rows.map(mapPost),
        });
      } catch (e2) {
        console.error("[GET /api/blog/mine fallback2]", e2);
        res.status(500).json({ success: false, message: "讀取我的文章失敗" });
      }
    }
  }
});

// =============================================================================
// 【區塊】待審核佇列 GET /pending-review（管理者）
// 誰用：blog/review 頁
// 做什麼：撈 pending_review 狀態的文章給管理者看
// =============================================================================
router.get(
  "/pending-review",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const role = await getMemberRole(req.user!.id);
      if (!isAdminRole(role)) {
        res.status(403).json({ success: false, message: "僅管理者可查看審查佇列" });
        return;
      }

      const statusFilter =
        typeof req.query.status === "string" && req.query.status.trim()
          ? req.query.status.trim()
          : "pending_review";

      const [rows] = await pool.query<PostRow[]>(
        `
          SELECT p.*, m.name AS author_name
          FROM posts p
          LEFT JOIN member m ON m.id = p.author_id
          WHERE p.status = ?
          ORDER BY p.updated_at DESC
        `,
        [statusFilter],
      );

      res.status(200).json({
        success: true,
        message: "審查佇列取得成功",
        posts: rows.map(mapPost),
      });
    } catch (error) {
      console.error("[GET /api/blog/pending-review]", error);
      res.status(500).json({ success: false, message: "讀取審查佇列失敗" });
    }
  },
);

// =============================================================================
// 【區塊】可寫文的訂單 GET /eligible-orders
// 誰用：新增文章頁（選「這篇文對應哪張已付款訂單」）
// 做什麼：order_status=paid 且還沒有綁 posts 的訂單
// 為什麼要綁訂單：體驗後寫心得，一篇文對應一筆消費
// =============================================================================
router.get(
  "/eligible-orders",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const memberId = req.user!.id;
      const withOrderCol = await postsHaveOrderColumns();
      const excludeWritten = withOrderCol
        ? `AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.order_id = om.id)`
        : "";

      const [rows] = await pool.query<RowDataPacket[]>(
        `
          SELECT
            om.id AS order_id,
            om.final_amount,
            om.created_at,
            om.order_status,
            COALESCE(
              (
                SELECT e.title
                FROM order_items oi
                INNER JOIN experiences e ON e.id = oi.experience_id
                WHERE oi.order_id = om.id
                ORDER BY oi.id ASC
                LIMIT 1
              ),
              CONCAT('訂單 ', om.id)
            ) AS order_title
          FROM order_main om
          WHERE om.member_id = ?
            AND om.order_status = 'paid'
            ${excludeWritten}
          ORDER BY om.created_at DESC
        `,
        [memberId],
      );

      res.status(200).json({
        success: true,
        message: "可撰寫訂單取得成功",
        orders: rows.map((r) => ({
          order_id: String(r.order_id),
          order_title: String(r.order_title),
          final_amount: Number(r.final_amount) || 0,
          created_at: toIso(r.created_at as Date | string),
          order_status: String(r.order_status),
        })),
      });
    } catch (error) {
      console.error("[GET /api/blog/eligible-orders]", error);
      res.status(500).json({
        success: false,
        message: "讀取可撰寫訂單失敗",
      });
    }
  },
);

// =============================================================================
// 【區塊】依 slug 取單篇 GET /slug/:slug
// 誰用：blog/[slug]/page.tsx 公開閱讀頁
// 新手：必須寫在 /:id 之前！否則 Express 會把 "slug" 當成 id
// =============================================================================
router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? "").trim();
    if (!slug) {
      res.status(400).json({ success: false, message: "缺少 slug" });
      return;
    }

    const select = await getPostSelect();
    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT ${select}
        FROM posts
        WHERE slug = ? AND status = 'published'
        LIMIT 1
      `,
      [slug],
    );

    const row = rows[0];
    if (!row) {
      res.status(404).json({ success: false, message: "找不到文章" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "文章取得成功",
      post: mapPost(row),
    });
  } catch (error) {
    console.error("[GET /api/blog/slug/:slug]", error);
    res.status(500).json({ success: false, message: "讀取失敗" });
  }
});

// =============================================================================
// 【區塊】依數字 id 取單篇 GET /:id
// 誰用：編輯、管理等需要用 id 操作時
// =============================================================================
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, message: "無效的文章 ID" });
      return;
    }

    const select = await getPostSelect();
    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT ${select}
        FROM posts
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    const row = rows[0];
    if (!row) {
      res.status(404).json({ success: false, message: "找不到文章" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "文章取得成功",
      post: mapPost(row),
    });
  } catch (error) {
    console.error("[GET /api/blog/:id]", error);
    res.status(500).json({ success: false, message: "讀取失敗" });
  }
});

// =============================================================================
// 【區塊】新增文章 POST /
// 誰用：blog/new → BlogPostForm 送出
// 做什麼：檢查登入、標題、訂單資格 → 把 base64 圖存成檔 → INSERT posts
// 新手：req.body 是前端 JSON；成功通常回 201 + 新文章物件
// =============================================================================
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const title = String(body.title ?? "").trim().slice(0, TITLE_MAX);
    const content = String(body.content ?? "").trim();
    const orderId = String(body.order_id ?? "").trim();
    let status = String(body.status ?? "draft");

    if (!title) {
      res.status(400).json({ success: false, message: "請填寫標題" });
      return;
    }
    if (!content) {
      res.status(400).json({ success: false, message: "請填寫內容" });
      return;
    }
    if (!orderId) {
      res.status(400).json({ success: false, message: "請選擇訂單（文章分類）" });
      return;
    }
    if (!ALLOWED_STATUS.has(status)) {
      status = "draft";
    }
    // 新建不可直接 published
    if (status === "published") {
      status = "pending_review";
    }

    const memberId = req.user!.id;

    // 訂單必須屬於本人且 paid
    const [orderRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT om.id, om.order_status,
          COALESCE(
            (
              SELECT e.title
              FROM order_items oi
              INNER JOIN experiences e ON e.id = oi.experience_id
              WHERE oi.order_id = om.id
              ORDER BY oi.id ASC
              LIMIT 1
            ),
            CONCAT('訂單 ', om.id)
          ) AS order_title
        FROM order_main om
        WHERE om.id = ? AND om.member_id = ?
        LIMIT 1
      `,
      [orderId, memberId],
    );
    const order = orderRows[0];
    if (!order) {
      res.status(400).json({ success: false, message: "找不到此訂單或非您的訂單" });
      return;
    }
    if (String(order.order_status) !== "paid") {
      res.status(400).json({ success: false, message: "僅已完成（已付款）訂單可撰寫文章" });
      return;
    }

    const withOrderCol = await postsHaveOrderColumns();
    if (withOrderCol) {
      const [dup] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM posts WHERE order_id = ? LIMIT 1`,
        [orderId],
      );
      if (dup.length > 0) {
        res.status(400).json({ success: false, message: "此訂單已撰寫過文章" });
        return;
      }
    }

    const orderTitle = String(order.order_title);
    const desired = body.slug ? slugify(String(body.slug)) : slugify(title);
    const slug = await ensureUniqueSlug(desired);
    const excerpt = emptyToNull(body.excerpt);
    const contentStored = persistHtmlDataImages(content);
    const coverImage = persistSingleImageField(emptyToNull(body.cover_image));
    const contentImage = persistSingleImageField(
      emptyToNull(body.content_image),
    );
    // category_id 保留相容：若有傳則用，否則 null
    const categoryId =
      body.category_id != null && Number(body.category_id) > 0
        ? Number(body.category_id)
        : null;

    let result: ResultSetHeader;
    if (withOrderCol) {
      const [insertResult] = await pool.query<ResultSetHeader>(
        `
          INSERT INTO posts (
            title, slug, content, excerpt, cover_image, content_image,
            status, published_at, author_id, category_id, order_id, order_title, review_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)
        `,
        [
          title,
          slug,
          contentStored,
          excerpt,
          coverImage,
          contentImage,
          status,
          memberId,
          categoryId,
          orderId,
          orderTitle,
        ],
      );
      result = insertResult;
    } else {
      // 尚未跑 schema 擴充：仍可寫文（訂單名稱寫進 excerpt 前綴備註，不擋列表）
      const excerptWithOrder =
        excerpt ??
        `[訂單 ${orderId}｜${orderTitle}]`;
      const [insertResult] = await pool.query<ResultSetHeader>(
        `
          INSERT INTO posts (
            title, slug, content, excerpt, cover_image, content_image,
            status, published_at, author_id, category_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `,
        [
          title,
          slug,
          contentStored,
          excerptWithOrder,
          coverImage,
          contentImage,
          status,
          memberId,
          categoryId,
        ],
      );
      result = insertResult;
    }

    const select = await getPostSelect();
    const [rows] = await pool.query<PostRow[]>(
      `SELECT ${select} FROM posts WHERE id = ? LIMIT 1`,
      [result.insertId],
    );

    const created = rows[0];
    if (!created) {
      res.status(500).json({ success: false, message: "文章建立後讀取失敗" });
      return;
    }

    res.status(201).json({
      success: true,
      message: "文章已儲存",
      post: mapPost(created),
    });
  } catch (error) {
    console.error("[POST /api/blog]", error);
    const err = error as { code?: string; message?: string };
    let message = "儲存文章失敗";
    if (err?.code === "ER_NO_REFERENCED_ROW_2" || err?.code === "ER_NO_REFERENCED_ROW") {
      message = "作者會員不存在，請重新登入後再試";
    } else if (err?.code === "ER_DUP_ENTRY") {
      message = "網址別名或訂單文章重複，請修改後再試";
    } else if (err?.code === "ER_BAD_FIELD_ERROR") {
      message = "資料庫缺少 order_id 欄位，請執行 wang-blog-order-review.sql";
    } else if (err?.code === "ER_DATA_TOO_LONG") {
      message = "欄位資料過長（標題最多 20 字）";
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }
    res.status(500).json({ success: false, message });
  }
});

// =============================================================================
// 【區塊】更新文章 PUT /:id
// 誰用：blog/[slug]/edit
// 規則：只有作者能改內容；綁定的 order 不可亂改
// =============================================================================
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, message: "無效的文章 ID" });
      return;
    }

    const [existingRows] = await pool.query<PostRow[]>(
      `SELECT * FROM posts WHERE id = ? LIMIT 1`,
      [id],
    );
    const prev = existingRows[0];
    if (!prev) {
      res.status(404).json({ success: false, message: "找不到文章" });
      return;
    }

    const role = await getMemberRole(req.user!.id);
    if (isAdminRole(role)) {
      res.status(403).json({
        success: false,
        message: "管理者請使用審查接口通過／駁回，不可編輯文章內容",
      });
      return;
    }

    if (Number(prev.author_id) !== Number(req.user!.id)) {
      res.status(403).json({
        success: false,
        message: "只能修改自己的文章",
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const title = String(body.title ?? prev.title).trim().slice(0, TITLE_MAX);
    const content = String(body.content ?? prev.content).trim();

    if (!title) {
      res.status(400).json({ success: false, message: "請填寫標題" });
      return;
    }
    if (!content) {
      res.status(400).json({ success: false, message: "請填寫內容" });
      return;
    }

    let status = String(body.status ?? prev.status);
    if (!ALLOWED_STATUS.has(status)) {
      status = prev.status;
    }
    // 會員不可自行 published
    if (status === "published") {
      status = "pending_review";
    }
    if (
      status === "published" &&
      (prev.status === "draft" || prev.status === "rejected")
    ) {
      status = "pending_review";
    }

    const desired = body.slug ? slugify(String(body.slug)) : slugify(title);
    const slug = await ensureUniqueSlug(desired, id);
    const excerpt =
      body.excerpt !== undefined ? emptyToNull(body.excerpt) : prev.excerpt;
    const contentStored = persistHtmlDataImages(content);
    const coverImage =
      body.cover_image !== undefined
        ? persistSingleImageField(emptyToNull(body.cover_image))
        : prev.cover_image;
    const contentImage =
      body.content_image !== undefined
        ? persistSingleImageField(emptyToNull(body.content_image))
        : prev.content_image;

    // order_id / order_title 鎖定不改
    await pool.query(
      `
        UPDATE posts SET
          title = ?,
          slug = ?,
          content = ?,
          excerpt = ?,
          cover_image = ?,
          content_image = ?,
          status = ?
        WHERE id = ?
      `,
      [
        title,
        slug,
        contentStored,
        excerpt,
        coverImage,
        contentImage,
        status,
        id,
      ],
    );

    const selectAfter = await getPostSelect();
    const [rows] = await pool.query<PostRow[]>(
      `SELECT ${selectAfter} FROM posts WHERE id = ? LIMIT 1`,
      [id],
    );

    const updated = rows[0];
    if (!updated) {
      res.status(500).json({ success: false, message: "文章更新後讀取失敗" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "文章已更新",
      post: mapPost(updated),
    });
  } catch (error) {
    console.error("[PUT /api/blog/:id]", error);
    const message = error instanceof Error ? error.message : "更新失敗";
    res.status(500).json({ success: false, message });
  }
});

// =============================================================================
// 【區塊】審查 POST /:id/review
// 誰用：blog/review
// body 常見：{ action: 'approve' | 'reject', review_note?: string }
// 通過 → published；駁回 → rejected + 註解給作者看
// =============================================================================
router.post(
  "/:id/review",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const role = await getMemberRole(req.user!.id);
      if (!isAdminRole(role)) {
        res.status(403).json({ success: false, message: "僅管理者可審查文章" });
        return;
      }

      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ success: false, message: "無效的文章 ID" });
        return;
      }

      const body = req.body as { action?: string; note?: string };
      const action = String(body.action ?? "").trim();
      const note = emptyToNull(body.note);

      if (action !== "approve" && action !== "reject") {
        res.status(400).json({
          success: false,
          message: "action 須為 approve 或 reject",
        });
        return;
      }

      const [existingRows] = await pool.query<PostRow[]>(
        `SELECT * FROM posts WHERE id = ? LIMIT 1`,
        [id],
      );
      const prev = existingRows[0];
      if (!prev) {
        res.status(404).json({ success: false, message: "找不到文章" });
        return;
      }

      if (prev.status !== "pending_review" && prev.status !== "rejected") {
        // 允許對 pending 審查；若已 rejected 可再通過
        if (prev.status === "published" && action === "approve") {
          res.status(400).json({ success: false, message: "文章已上架" });
          return;
        }
      }

      const nextStatus = action === "approve" ? "published" : "rejected";
      const publishedAt =
        action === "approve"
          ? (prev.published_at ?? new Date())
          : prev.published_at;

      // ⭐ 有 review_note 欄就寫入（使用者可能只加了此欄、沒有 order_id）
      if (await postsHaveReviewNote()) {
        await pool.query(
          `
            UPDATE posts SET
              status = ?,
              published_at = ?,
              review_note = ?
            WHERE id = ?
          `,
          [nextStatus, publishedAt, note, id],
        );
      } else {
        await pool.query(
          `
            UPDATE posts SET
              status = ?,
              published_at = ?
            WHERE id = ?
          `,
          [nextStatus, publishedAt, id],
        );
      }

      const select = await getPostSelect();
      const [rows] = await pool.query<PostRow[]>(
        `SELECT ${select} FROM posts WHERE id = ? LIMIT 1`,
        [id],
      );

      res.status(200).json({
        success: true,
        message: action === "approve" ? "已通過並上架" : "已駁回",
        post: mapPost(rows[0]!),
      });
    } catch (error) {
      console.error("[POST /api/blog/:id/review]", error);
      res.status(500).json({ success: false, message: "審查操作失敗" });
    }
  },
);

// =============================================================================
// 【區塊】刪除 DELETE /:id（僅作者）
// =============================================================================
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, message: "無效的文章 ID" });
      return;
    }

    const [existingRows] = await pool.query<PostRow[]>(
      `SELECT id, author_id FROM posts WHERE id = ? LIMIT 1`,
      [id],
    );
    const prev = existingRows[0];
    if (!prev) {
      res.status(404).json({ success: false, message: "找不到文章" });
      return;
    }

    if (Number(prev.author_id) !== Number(req.user!.id)) {
      res.status(403).json({
        success: false,
        message: "只能刪除自己的文章",
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM posts WHERE id = ?`,
      [id],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: "找不到文章" });
      return;
    }

    res.status(200).json({ success: true, message: "文章已刪除" });
  } catch (error) {
    console.error("[DELETE /api/blog/:id]", error);
    res.status(500).json({ success: false, message: "刪除失敗" });
  }
});

export default router;
