/**
 * 會員訂單 API（對齊 order_main / order_items / experiences / sessions）
 *
 * 掛載：app.use("/api/member-order", apiMemberOrderRouter)
 * （獨立檔，不修改 api-member.ts）
 *
 * GET  /api/member-order           目前登入會員的訂單列表（含明細）
 * POST /api/member-order/review-image  上傳評價圖片
 * POST /api/member-order/items/:itemId/review  新增單一訂單項目評價
 */
import { type Request, type Response, Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js";
import {
  reviewImageUpload,
  toReviewPublicPath,
} from "../utils/upload-review-image.js";

const router: Router = Router();

type OrderMainRow = RowDataPacket & {
  id: string;
  member_id: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  payment_method: string;
  order_status: "pending" | "paid" | "cancelled" | string;
  original_amount: number | string;
  coupon_id: number | null;
  coupon_discount: number | string;
  points_redeemed: number;
  final_amount: number | string;
  points_earned: number;
  created_at: Date | string;
  updated_at: Date | string;
};

type ReviewImage = {
  id: number;
  image_url: string;
  sort_order: number;
};

type OrderItemRow = RowDataPacket & {
  id: number;
  order_id: string;
  experience_id: number;
  session_id: number;
  original_unit_price: number | string;
  quantity: number;
  subtotal: number | string;
  item_status: string;
  special_request: string | null;
  experience_title: string | null;
  experience_city: string | null;
  session_start: Date | string | null;
  session_end: Date | string | null;
  image_url: string | null;
  review_id: number | null;
  review_rating: number | null;
  review_comment: string | null;
  review_images: ReviewImage[];
  review_created_at: Date | string | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function num(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapStatusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "訂單已確認";
    case "pending":
      return "待付款";
    case "cancelled":
      return "已取消";
    default:
      return status;
  }
}

function mapPaymentLabel(method: string): string {
  switch (method) {
    case "credit_card":
      return "信用卡";
    case "line_pay":
      return "LINE Pay";
    case "bank_transfer":
      return "銀行轉帳";
    default:
      return method || "—";
  }
}

async function fetchItemsForOrders(
  orderIds: string[],
): Promise<Map<string, OrderItemRow[]>> {
  const map = new Map<string, OrderItemRow[]>();
  if (orderIds.length === 0) return map;

  const placeholders = orderIds.map(() => "?").join(", ");
  const [rows] = await pool.query<OrderItemRow[]>(
    `
      SELECT
        oi.id,
        oi.order_id,
        oi.experience_id,
        oi.session_id,
        oi.original_unit_price,
        oi.quantity,
        oi.subtotal,
        oi.item_status,
        oi.special_request,
        e.title AS experience_title,
        e.city AS experience_city,
        s.start_time AS session_start,
        s.end_time AS session_end,
        (
          SELECT ei.image_url
          FROM experience_images ei
          WHERE ei.experience_id = oi.experience_id
          ORDER BY ei.is_primary DESC, ei.sort_order ASC, ei.id ASC
          LIMIT 1
        ) AS image_url,
        r.id AS review_id,
        r.rating AS review_rating,
        r.comment AS review_comment,
        r.created_at AS review_created_at
      FROM order_items oi
      LEFT JOIN experiences e ON e.id = oi.experience_id
      LEFT JOIN sessions s ON s.id = oi.session_id
      LEFT JOIN experience_reviews r
        ON r.order_item_id = oi.id
      WHERE oi.order_id IN (${placeholders})
      ORDER BY oi.id ASC
    `,
    orderIds,
  );
  const reviewIds = [
    ...new Set(
      rows
        .map((row) => Number(row.review_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  const imagesByReviewId = new Map<number, ReviewImage[]>();

  if (reviewIds.length > 0) {
    const reviewPlaceholders = reviewIds.map(() => "?").join(", ");

    const [imageRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT id, review_id, image_url, sort_order
      FROM experience_review_images
      WHERE review_id IN (${reviewPlaceholders})
      ORDER BY review_id ASC, sort_order ASC, id ASC
    `,
      reviewIds,
    );

    for (const image of imageRows) {
      const reviewId = Number(image.review_id);
      const images = imagesByReviewId.get(reviewId) ?? [];

      images.push({
        id: Number(image.id),
        image_url: String(image.image_url),
        sort_order: Number(image.sort_order),
      });

      imagesByReviewId.set(reviewId, images);
    }
  }

  for (const row of rows) {
    row.review_images =
      row.review_id == null
        ? []
        : (imagesByReviewId.get(Number(row.review_id)) ?? []);
  }
  for (const row of rows) {
    const key = String(row.order_id);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

function mapItemReview(it: OrderItemRow) {
  if (it.review_id == null) return null;
  return {
    id: Number(it.review_id),
    rating: Number(it.review_rating) || 0,
    comment: String(it.review_comment ?? ""),
    images: it.review_images ?? [],
    created_at: toIso(it.review_created_at),
  };
}

function mapOrder(main: OrderMainRow, items: OrderItemRow[]) {
  const mappedItems = items.map((it) => {
    const review = mapItemReview(it);
    return {
      id: Number(it.id),
      experience_id: Number(it.experience_id),
      session_id: Number(it.session_id),
      title: it.experience_title || `體驗 #${it.experience_id}`,
      city: it.experience_city || null,
      unit_price: num(it.original_unit_price),
      quantity: Number(it.quantity) || 0,
      subtotal: num(it.subtotal),
      item_status: String(it.item_status),
      special_request: it.special_request ?? null,
      session_start: toIso(it.session_start),
      session_end: toIso(it.session_end),
      image_url: it.image_url ?? null,
      has_review: review != null,
      review,
    };
  });

  const primary = mappedItems[0];
  const reviewableItems = mappedItems.filter(
    (it) =>
      String(main.order_status) === "paid" && it.item_status !== "cancelled",
  );
  const allReviewed =
    reviewableItems.length > 0 && reviewableItems.every((it) => it.has_review);
  const anyReviewed = reviewableItems.some((it) => it.has_review);
  const canReview =
    String(main.order_status) === "paid" &&
    reviewableItems.some((it) => !it.has_review);

  return {
    id: String(main.id),
    member_id: Number(main.member_id),
    contact_name: main.contact_name,
    contact_phone: main.contact_phone,
    contact_email: main.contact_email,
    payment_method: main.payment_method,
    payment_label: mapPaymentLabel(main.payment_method),
    order_status: main.order_status,
    status_label: mapStatusLabel(String(main.order_status)),
    original_amount: num(main.original_amount),
    coupon_id: main.coupon_id == null ? null : Number(main.coupon_id),
    coupon_discount: num(main.coupon_discount),
    points_redeemed: Number(main.points_redeemed) || 0,
    final_amount: num(main.final_amount),
    points_earned: Number(main.points_earned) || 0,
    created_at: toIso(main.created_at),
    updated_at: toIso(main.updated_at),
    /** 列表卡片主標題／主圖（第一筆明細） */
    title: primary?.title ?? "訂單",
    image_url: primary?.image_url ?? null,
    items: mappedItems,
    /** 是否可取消 */
    can_cancel: main.order_status === "pending" || main.order_status === "paid",
    /** 評價狀態（訂單層） */
    can_review: canReview,
    has_review: anyReviewed,
    all_reviewed: allReviewed,
  };
}

/**
 * GET /
 * 會員歷史訂單列表
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const memberId = req.user!.id;
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status.trim() : "";

    const clauses = ["member_id = ?"];
    const params: unknown[] = [memberId];
    if (
      statusFilter === "pending" ||
      statusFilter === "paid" ||
      statusFilter === "cancelled"
    ) {
      clauses.push("order_status = ?");
      params.push(statusFilter);
    }

    const [orderRows] = await pool.query<OrderMainRow[]>(
      `
        SELECT
          id, member_id, contact_name, contact_phone, contact_email,
          payment_method, order_status, original_amount, coupon_id,
          coupon_discount, points_redeemed, final_amount, points_earned,
          created_at, updated_at
        FROM order_main
        WHERE ${clauses.join(" AND ")}
        ORDER BY created_at DESC
      `,
      params,
    );

    const ids = orderRows.map((o) => String(o.id));
    const itemMap = await fetchItemsForOrders(ids);
    const orders = orderRows.map((o) =>
      mapOrder(o, itemMap.get(String(o.id)) ?? []),
    );

    res.status(200).json({
      success: true,
      message: "訂單列表取得成功",
      data: { orders },
    });
  } catch (error) {
    console.error("[GET /api/member-order]", error);
    res.status(500).json({ success: false, message: "取得訂單失敗" });
  }
});

/**
 * POST /review-image
 * 評價照片上傳 multipart field: image
 */
router.post(
  "/review-image",
  authenticate,
  (req: Request, res: Response, next) => {
    reviewImageUpload.single("image")(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "上傳失敗";
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "LIMIT_FILE_SIZE"
        ) {
          res.status(400).json({
            success: false,
            message: "圖片不可超過 5MB",
          });
          return;
        }
        res.status(400).json({ success: false, message });
        return;
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          message: "請選擇圖片（欄位名稱：image）",
        });
        return;
      }
      const relativePath = toReviewPublicPath(file.filename);
      const base = `${req.protocol}://${req.get("host")}`;
      res.status(201).json({
        success: true,
        message: "評價圖片上傳成功",
        path: relativePath,
        url: `${base}${relativePath}`,
      });
    } catch (error) {
      console.error("[POST /api/member-order/review-image]", error);
      res.status(500).json({ success: false, message: "上傳失敗" });
    }
  },
);

/**
 * POST /items/:itemId/review
 * 對單一 order_item 新增評價（僅 paid 訂單、本人、尚未評價）
 */
router.post(
  "/items/:itemId/review",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const memberId = req.user!.id;
      const itemId = Number(req.params.itemId);
      if (!Number.isFinite(itemId) || itemId <= 0) {
        res.status(400).json({ success: false, message: "無效的訂單明細" });
        return;
      }

      const body = req.body as {
        rating?: number;
        comment?: string;
        image_urls?: unknown;
      };

      const rating = Number(body.rating);
      const comment = String(body.comment ?? "").trim();

      const imageUrls = Array.isArray(body.image_urls)
        ? body.image_urls
            .filter((url): url is string => typeof url === "string")
            .map((url) => url.trim())
            .filter(Boolean)
        : [];
      if (imageUrls.length > 6) {
        res.status(400).json({
          success: false,
          message: "最多可上傳 6 張評價照片",
        });
        return;
      }

      if (imageUrls.some((url) => url.length > 500)) {
        res.status(400).json({
          success: false,
          message: "圖片路徑格式錯誤",
        });
        return;
      }

      if (imageUrls.some((url) => !url.startsWith("/uploads/reviews/"))) {
        res.status(400).json({
          success: false,
          message: "圖片路徑無效",
        });
        return;
      }
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        res.status(400).json({ success: false, message: "評分請選 1～5 星" });
        return;
      }
      if (!comment) {
        res.status(400).json({ success: false, message: "請填寫使用心得" });
        return;
      }
      if (comment.length > 300) {
        res.status(400).json({ success: false, message: "心得最多 300 字" });
        return;
      }

      const [itemRows] = await pool.query<
        (RowDataPacket & {
          id: number;
          order_id: string;
          experience_id: number;
          item_status: string;
          order_status: string;
          member_id: number;
        })[]
      >(
        `
          SELECT
            oi.id,
            oi.order_id,
            oi.experience_id,
            oi.item_status,
            om.order_status,
            om.member_id
          FROM order_items oi
          INNER JOIN order_main om ON om.id = oi.order_id
          WHERE oi.id = ?
          LIMIT 1
        `,
        [itemId],
      );

      const item = itemRows[0];
      if (!item || Number(item.member_id) !== memberId) {
        res.status(404).json({ success: false, message: "找不到訂單明細" });
        return;
      }
      if (String(item.order_status) !== "paid") {
        res.status(400).json({
          success: false,
          message: "僅已確認（已付款）訂單可評價",
        });
        return;
      }
      if (String(item.item_status) === "cancelled") {
        res
          .status(400)
          .json({ success: false, message: "已取消的項目無法評價" });
        return;
      }

      const [exist] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM experience_reviews WHERE order_item_id = ? LIMIT 1`,
        [itemId],
      );
      if (exist.length > 0) {
        res.status(400).json({ success: false, message: "此項目已評價過" });
        return;
      }

      const [insertResult] = await pool.query<ResultSetHeader>(
        `
    INSERT INTO experience_reviews
      (order_item_id, experience_id, member_id, rating, comment, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, NULL, NOW())
  `,
        [itemId, Number(item.experience_id), memberId, rating, comment],
      );
      if (imageUrls.length > 0) {
        const values = imageUrls.map((imageUrl, index) => [
          insertResult.insertId,
          imageUrl,
          index,
        ]);

        const placeholders = values.map(() => "(?, ?, ?)").join(", ");

        await pool.query(
          `
      INSERT INTO experience_review_images
        (review_id, image_url, sort_order)
      VALUES ${placeholders}
    `,
          values.flat(),
        );
      }

      const [reviewRows] = await pool.query<RowDataPacket[]>(
        `
          SELECT id, rating, comment, image_url, created_at
          FROM experience_reviews
          WHERE id = ?
          LIMIT 1
        `,
        [insertResult.insertId],
      );
      const r = reviewRows[0];
      const [reviewImageRows] = await pool.query<RowDataPacket[]>(
        `
    SELECT id, image_url, sort_order
    FROM experience_review_images
    WHERE review_id = ?
    ORDER BY sort_order ASC, id ASC
  `,
        [insertResult.insertId],
      );
      // 回傳更新後的整筆訂單，方便前端刷新卡片
      const orderId = String(item.order_id);
      const [orderRows] = await pool.query<OrderMainRow[]>(
        `
          SELECT
            id, member_id, contact_name, contact_phone, contact_email,
            payment_method, order_status, original_amount, coupon_id,
            coupon_discount, points_redeemed, final_amount, points_earned,
            created_at, updated_at
          FROM order_main
          WHERE id = ?
          LIMIT 1
        `,
        [orderId],
      );
      const itemMap = await fetchItemsForOrders([orderId]);

      res.status(201).json({
        success: true,
        message: "評價已送出，感謝您的回饋",
        data: {
          review: r
            ? {
                id: Number(r.id),
                rating: Number(r.rating),
                comment: String(r.comment),
                images: reviewImageRows.map((image) => ({
                  id: Number(image.id),
                  image_url: String(image.image_url),
                  sort_order: Number(image.sort_order),
                })),
                created_at: toIso(r.created_at as Date | string),
              }
            : null,
          order: mapOrder(orderRows[0]!, itemMap.get(orderId) ?? []),
        },
      });
    } catch (error) {
      console.error("[POST /api/member-order/items/:itemId/review]", error);
      res.status(500).json({ success: false, message: "送出評價失敗" });
    }
  },
);

export default router;
