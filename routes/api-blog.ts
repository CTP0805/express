/**
 * 部落格 API（對應資料表 posts）
 *
 * 掛載：app.use("/api/blog", apiBlogRouter)
 *
 * GET    /api/blog          文章列表（query: status, category_id）
 * GET    /api/blog/:id      依 id 取得單篇
 * GET    /api/blog/slug/:slug 依 slug 取得已上架文章
 * POST   /api/blog          新增文章（需登入）
 * PUT    /api/blog/:id      更新文章（需登入）
 * DELETE /api/blog/:id      刪除文章（需登入）
 *
 * 欄位對齊 schema.sql → posts：
 * id, title, slug, content, excerpt, cover_image, content_image,
 * status, published_at, updated_at, created_at, author_id, category_id
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

const TITLE_MAX = 20;
const ALLOWED_STATUS = new Set([
  "draft",
  "pending_review",
  "published",
  "rejected",
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
};

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
  };
}

/** 標題 → slug（後端後備；前端通常已傳 slug） */
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

// ── 列表 ──────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, category_id } = req.query;
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (typeof status === "string" && status.trim()) {
      clauses.push("status = ?");
      params.push(status.trim());
    }
    if (category_id != null && String(category_id).trim() !== "") {
      clauses.push("category_id = ?");
      params.push(Number(category_id));
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT
          id, title, slug, content, excerpt, cover_image, content_image,
          status, published_at, updated_at, created_at, author_id, category_id
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
    res.status(500).json({ success: false, message: "讀取文章失敗" });
  }
});

// ── 依 slug（放在 /:id 之前避免被當成 id） ────────────
router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? "").trim();
    if (!slug) {
      res.status(400).json({ success: false, message: "缺少 slug" });
      return;
    }

    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT
          id, title, slug, content, excerpt, cover_image, content_image,
          status, published_at, updated_at, created_at, author_id, category_id
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

// ── 單篇 by id ────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, message: "無效的文章 ID" });
      return;
    }

    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT
          id, title, slug, content, excerpt, cover_image, content_image,
          status, published_at, updated_at, created_at, author_id, category_id
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

// ── 新增 ──────────────────────────────────────────────
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const title = String(body.title ?? "").trim().slice(0, TITLE_MAX);
    const content = String(body.content ?? "").trim();
    const categoryId = Number(body.category_id);
    let status = String(body.status ?? "draft");

    if (!title) {
      res.status(400).json({ success: false, message: "請填寫標題" });
      return;
    }
    if (!content) {
      res.status(400).json({ success: false, message: "請填寫內容" });
      return;
    }
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      res.status(400).json({ success: false, message: "請選擇分類" });
      return;
    }
    if (!ALLOWED_STATUS.has(status)) {
      status = "draft";
    }
    // 新建不可直接 published，需經審核
    if (status === "published") {
      status = "pending_review";
    }

    const desired = body.slug
      ? slugify(String(body.slug))
      : slugify(title);
    const slug = await ensureUniqueSlug(desired);
    const authorId = req.user!.id;
    const excerpt = emptyToNull(body.excerpt);
    // 內文／封面 base64 → 存 public/uploads/blog，DB 只留路徑
    const contentStored = persistHtmlDataImages(content);
    const coverImage = persistSingleImageField(emptyToNull(body.cover_image));
    const contentImage = persistSingleImageField(
      emptyToNull(body.content_image),
    );
    const publishedAt = status === "published" ? new Date() : null;

    const [result] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO posts (
          title, slug, content, excerpt, cover_image, content_image,
          status, published_at, author_id, category_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        slug,
        contentStored,
        excerpt,
        coverImage,
        contentImage,
        status,
        publishedAt,
        authorId,
        categoryId,
      ],
    );

    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT
          id, title, slug, content, excerpt, cover_image, content_image,
          status, published_at, updated_at, created_at, author_id, category_id
        FROM posts WHERE id = ? LIMIT 1
      `,
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
    // 常見 MySQL 錯誤轉成可讀訊息
    const err = error as { code?: string; message?: string };
    let message = "儲存文章失敗";
    if (err?.code === "ER_NO_REFERENCED_ROW_2" || err?.code === "ER_NO_REFERENCED_ROW") {
      message = "作者會員不存在，請重新登入後再試";
    } else if (err?.code === "ER_DUP_ENTRY") {
      message = "網址別名重複，請修改標題後再試";
    } else if (err?.code === "ER_DATA_TOO_LONG") {
      message = "欄位資料過長（標題最多 20 字）";
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }
    res.status(500).json({ success: false, message });
  }
});

// ── 更新 ──────────────────────────────────────────────
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

    // 僅作者本人可修改
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
    const categoryId =
      body.category_id != null
        ? Number(body.category_id)
        : Number(prev.category_id ?? 1);

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

    // 草稿／退件不可直接上架
    if (
      status === "published" &&
      (prev.status === "draft" || prev.status === "rejected")
    ) {
      status = "pending_review";
    }

    const desired = body.slug
      ? slugify(String(body.slug))
      : slugify(title);
    const slug = await ensureUniqueSlug(desired, id);
    const excerpt =
      body.excerpt !== undefined
        ? emptyToNull(body.excerpt)
        : prev.excerpt;
    // 內文 base64 → 檔案路徑
    const contentStored = persistHtmlDataImages(content);
    const coverImage =
      body.cover_image !== undefined
        ? persistSingleImageField(emptyToNull(body.cover_image))
        : prev.cover_image;
    const contentImage =
      body.content_image !== undefined
        ? persistSingleImageField(emptyToNull(body.content_image))
        : prev.content_image;

    let publishedAt: Date | string | null = prev.published_at;
    if (status === "published") {
      publishedAt = prev.published_at ?? new Date();
    } else if (status !== "published") {
      // 非上架狀態不強制清空已存在的 published_at（保留歷史）；若從未上架則維持 null
      if (prev.status !== "published" && status !== "published") {
        publishedAt = prev.published_at;
      }
    }

    await pool.query(
      `
        UPDATE posts SET
          title = ?,
          slug = ?,
          content = ?,
          excerpt = ?,
          cover_image = ?,
          content_image = ?,
          status = ?,
          published_at = ?,
          category_id = ?
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
        publishedAt,
        categoryId,
        id,
      ],
    );

    const [rows] = await pool.query<PostRow[]>(
      `
        SELECT
          id, title, slug, content, excerpt, cover_image, content_image,
          status, published_at, updated_at, created_at, author_id, category_id
        FROM posts WHERE id = ? LIMIT 1
      `,
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

// ── 刪除 ──────────────────────────────────────────────
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

    // 僅作者本人可刪除
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
