import { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";

const router: Router = Router();
// 取得商品列表頁
router.get("/", async (req: Request, res: Response) => {
  try {
    // 城市參數，例如：?city=台北
    const city =
      typeof req.query.city === "string" ? req.query.city.trim() : "";

    // 類別參數，例如：?category_ids=1,3,4
    const categoryIds =
      typeof req.query.category_ids === "string"
        ? [
            ...new Set(
              req.query.category_ids
                .split(",")
                .map(Number)
                .filter((id) => Number.isInteger(id) && id > 0),
            ),
          ]
        : [];

    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

    const date = typeof req.query.date === "string" ? req.query.date : "all";

    const minPrice =
      typeof req.query.min_price === "string"
        ? Number(req.query.min_price)
        : null;

    const maxPrice =
      typeof req.query.max_price === "string"
        ? Number(req.query.max_price)
        : null;

    const sort =
      typeof req.query.sort === "string" ? req.query.sort : "popular";

    const requestedPage =
      typeof req.query.page === "string" ? Number(req.query.page) : 1;

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const limit = 12;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    // 只顯示目前仍有可預訂場次的體驗
    conditions.push("ps.experience_id IS NOT NULL");
    if (keyword) {
      const searchKeyword = `%${keyword}%`;

      conditions.push(`
    (
      e.city LIKE ?
      OR e.title LIKE ?
      OR c.category_name LIKE ?
    )
  `);

      params.push(searchKeyword, searchKeyword, searchKeyword);
    }
    // 有傳城市才加入城市條件
    if (city) {
      conditions.push("e.city = ?");
      params.push(city);
    }

    // 有傳類別才加入類別條件
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(", ");

      conditions.push(`e.category_id IN (${placeholders})`);

      params.push(...categoryIds);
    }

    if (minPrice !== null && Number.isFinite(minPrice) && minPrice >= 0) {
      conditions.push("ps.adult_min_price >= ?");
      params.push(minPrice);
    }

    if (maxPrice !== null && Number.isFinite(maxPrice) && maxPrice >= 0) {
      conditions.push("ps.adult_min_price <= ?");
      params.push(maxPrice);
    }

    if (date === "tomorrow") {
      conditions.push(`
    EXISTS (
      SELECT 1
      FROM sessions date_session
      WHERE date_session.experience_id = e.id
        AND date_session.status = 1
        AND date_session.start_time >= NOW()
        AND date_session.booking_deadline >= NOW()
        AND DATE(date_session.start_time)
          = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    )
  `);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      conditions.push(`
    EXISTS (
      SELECT 1
      FROM sessions date_session
      WHERE date_session.experience_id = e.id
        AND date_session.status = 1
        AND date_session.start_time >= NOW()
        AND date_session.booking_deadline >= NOW()
        AND DATE(date_session.start_time) = ?
    )
  `);

      params.push(date);
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderBySql = `
  ORDER BY
    COALESCE(os.participant_count_30d, 0) DESC,
    e.id ASC
`;

    if (sort === "rating") {
      orderBySql = `
    ORDER BY
      COALESCE(rs.rating, 0) DESC,
      COALESCE(rs.review_count, 0) DESC,
      e.id ASC
  `;
    }

    if (sort === "price_asc") {
      orderBySql = `
    ORDER BY
      ps.adult_min_price IS NULL ASC,
      ps.adult_min_price ASC,
      e.id ASC
  `;
    }

    const sql = `
      SELECT
        e.id,
        e.title,
        e.city,
        c.category_name,

        COALESCE(ps.adult_min_price, 0) AS price,
        ci.image_url AS image_url,

      COALESCE(rs.rating, 0) AS rating,
COALESCE(rs.review_count, 0) AS review_count

      FROM experiences e

      LEFT JOIN experience_categories c
        ON e.category_id = c.id

      LEFT JOIN (
        SELECT
          experience_id,
          MIN(adult_price) AS adult_min_price
        FROM sessions
        WHERE status = 1
          AND start_time >= NOW()
          AND booking_deadline >= NOW()
        GROUP BY experience_id
      ) ps
        ON e.id = ps.experience_id

      LEFT JOIN (
        SELECT experience_id, image_url
        FROM (
          SELECT
            experience_id,
            image_url,
            ROW_NUMBER() OVER (
              PARTITION BY experience_id
              ORDER BY is_primary DESC, sort_order ASC, id ASC
            ) AS rn
          FROM experience_images
        ) ranked_images
        WHERE rn = 1
      ) ci
        ON e.id = ci.experience_id

      LEFT JOIN (
        SELECT
          experience_id,
          ROUND(AVG(rating), 1) AS rating,
          COUNT(*) AS review_count
        FROM experience_reviews
        GROUP BY experience_id
      ) rs
        ON e.id = rs.experience_id

LEFT JOIN (
  SELECT
    oi.experience_id,
    SUM(oi.quantity) AS participant_count_30d
  FROM order_items oi
  INNER JOIN order_main om
    ON om.id = oi.order_id
  WHERE om.order_status = 'paid'
    AND oi.item_status = 'confirmed'
    AND om.created_at >= NOW() - INTERVAL 30 DAY
  GROUP BY oi.experience_id
) os
  ON e.id = os.experience_id

         ${whereSql}
      ${orderBySql}
      LIMIT ? OFFSET ?
    `;

    const countSql = `
  SELECT COUNT(*) AS total
  FROM experiences e

LEFT JOIN experience_categories c
  ON e.category_id = c.id
  
  LEFT JOIN (
    SELECT
      experience_id,
      MIN(adult_price) AS adult_min_price
    FROM sessions
    WHERE status = 1
      AND start_time >= NOW()
      AND booking_deadline >= NOW()
    GROUP BY experience_id
  ) ps
    ON e.id = ps.experience_id

  ${whereSql}
`;
    const listParams = [...params, limit, offset];
    const [rows] = await pool.query(sql, listParams);
    const [countRows] = await pool.query(countSql, params);
    const experiences = rows as any[];

    const countResult = countRows as {
      total: number | string;
    }[];

    const total = Number(countResult[0]?.total ?? 0);

    const totalPages = Math.ceil(total / limit);

    res.json({
      status: "success",

      data: experiences.map((experience) => ({
        ...experience,
        price: Number(experience.price),
        rating: Number(experience.rating),
        review_count: Number(experience.review_count),
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("取得商品列表失敗:", error);
    res.status(500).json({
      status: "error",
      message: "伺服器內部錯誤",
    });
  }
});

// 取得體驗分類與各分類的體驗數量
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

    const city =
      typeof req.query.city === "string" ? req.query.city.trim() : "";
    const date = typeof req.query.date === "string" ? req.query.date : "";

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (keyword) {
      const searchKeyword = `%${keyword}%`;

      conditions.push(`
        (
          e.city LIKE ?
          OR e.title LIKE ?
          OR c.category_name LIKE ?
        )
      `);

      params.push(searchKeyword, searchKeyword, searchKeyword);
    }

    if (city) {
      conditions.push("e.city = ?");
      params.push(city);
    }
    if (date === "tomorrow") {
      conditions.push(`
    EXISTS (
      SELECT 1
      FROM sessions date_session
      WHERE date_session.experience_id = e.id
        AND date_session.status = 1
        AND date_session.start_time >= NOW()
        AND date_session.booking_deadline >= NOW()
        AND DATE(date_session.start_time)
          = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    )
  `);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      conditions.push(`
    EXISTS (
      SELECT 1
      FROM sessions date_session
      WHERE date_session.experience_id = e.id
        AND date_session.status = 1
        AND date_session.start_time >= NOW()
        AND date_session.booking_deadline >= NOW()
        AND DATE(date_session.start_time) = ?
    )
  `);

      params.push(date);
    }
    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        c.id,
        c.category_name,
        COUNT(e.id) AS experience_count

      FROM experiences e

      INNER JOIN experience_categories c
        ON e.category_id = c.id

      ${whereSql}

      GROUP BY
        c.id,
        c.category_name

      ORDER BY c.id ASC
    `;

    const [rows] = await pool.query(sql, params);

    const categories = (rows as any[]).map((category) => ({
      id: Number(category.id),
      label: category.category_name,
      count: Number(category.experience_count),
    }));

    res.json({
      status: "success",
      data: categories,
    });
  } catch (error) {
    console.error("取得活動分類失敗：", error);

    res.status(500).json({
      status: "error",
      message: "伺服器內部錯誤",
    });
  }
});

// 取得商品詳情頁
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // 拿到網址上的商品 ID

    // 💡 根據實際的資料表，進行精準的 LEFT JOIN 查詢
    const sql = `
  SELECT
    e.id,
    e.category_id,
    c.category_name,
    e.host_id,
    e.title,
    e.description,
    e.meeting_point,
    e.city,
    e.longitude,
    e.latitude,

    COALESCE(ps.adult_min_price, 0) AS price,
    COALESCE(ps.adult_min_price, 0) AS adult_price,
    COALESCE(ps.child_min_price, 0) AS child_price,
    COALESCE(ps.duration_minutes, 0) AS duration_minutes,

    ci.image_url AS image_url,

    COALESCE(rs.rating, 5.0) AS rating,
    COALESCE(rs.review_count, 0) AS review_count,

    h.name AS host_name,
    h.bio AS host_bio,
    h.avatar AS host_avatar,
    h.role AS host_role

  FROM experiences e

  LEFT JOIN experience_categories c
    ON e.category_id = c.id

  LEFT JOIN hosts h
    ON e.host_id = h.id

  LEFT JOIN (
    SELECT
      experience_id,
      MIN(adult_price) AS adult_min_price,
      MIN(child_price) AS child_min_price,
      MIN(TIMESTAMPDIFF(MINUTE, start_time, end_time)) AS duration_minutes
    FROM sessions
    WHERE status = 1
      AND start_time >= NOW()
      AND booking_deadline >= NOW()
    GROUP BY experience_id
  ) ps
    ON e.id = ps.experience_id

  LEFT JOIN (
    SELECT experience_id, image_url
    FROM (
      SELECT
        experience_id,
        image_url,
        ROW_NUMBER() OVER (
          PARTITION BY experience_id
          ORDER BY is_primary DESC, sort_order ASC, id ASC
        ) AS rn
      FROM experience_images
    ) ranked_images
    WHERE rn = 1
  ) ci
    ON e.id = ci.experience_id

  LEFT JOIN (
    SELECT
      experience_id,
      ROUND(AVG(rating), 1) AS rating,
      COUNT(*) AS review_count
    FROM experience_reviews
    GROUP BY experience_id
  ) rs
    ON e.id = rs.experience_id

  WHERE e.id = ?
  LIMIT 1
`;

    // 💡 2. 執行剛才宣告好的 sql 變數 (帶入 id 參數)
    const [rows] = await pool.query(sql, [id]);
    const experiences = rows as any[];

    // 如果找不到該商品，回傳 404
    if (experiences.length === 0 || !experiences[0].id) {
      return res.status(404).json({
        status: "error",
        message: "找不到該項體驗商品",
      });
    }

    const experience = experiences[0];

    const notesSql = `
  SELECT
    title,
    content
  FROM category_notes
  WHERE category_id = ?
  ORDER BY sort_order ASC, id ASC
`;

    const [noteRows] = await pool.query(notesSql, [experience.category_id]);
    const notes = noteRows as { title: string; content: string }[];
    const [imageRows] = await pool.query(
      `
    SELECT
      id,
      image_url,
      is_primary,
      sort_order
    FROM experience_images
    WHERE experience_id = ?
    ORDER BY is_primary DESC, sort_order ASC, id ASC
  `,
      [experience.id],
    );

    const images = (
      imageRows as {
        id: number;
        image_url: string;
        is_primary: number;
        sort_order: number;
      }[]
    ).map((image) => ({
      id: Number(image.id),
      image_url: image.image_url,
      is_primary: Number(image.is_primary),
      sort_order: Number(image.sort_order),
    }));
    const sessionsSql = `
SELECT
  id,
  start_time,
  end_time,
  adult_price,
  child_price,
  min_participants,
  max_participants
FROM sessions
  WHERE experience_id = ?
    AND status = 1
    AND start_time >= NOW()
    AND booking_deadline >= NOW()
  ORDER BY start_time ASC
`;

    const [sessionRows] = await pool.query(sessionsSql, [experience.id]);

    const sessions = (sessionRows as any[]).map((session) => ({
      ...session,
      adult_price: Number(session.adult_price),
      child_price: Number(session.child_price),
      min_participants: Number(session.min_participants),
      max_participants: Number(session.max_participants),
    }));

    const reviewsSql = `
  SELECT
    r.id,
    r.member_id,
    r.rating,
    r.comment,
    r.created_at,
    r.image_url,

    m.name AS member_name,
    m.avatar_url AS member_avatar,

    s.start_time AS departure_date
  FROM experience_reviews r
  LEFT JOIN member m
    ON r.member_id = m.id
  LEFT JOIN order_items oi
    ON r.order_item_id = oi.id
  LEFT JOIN sessions s
    ON oi.session_id = s.id
  WHERE r.experience_id = ?
  ORDER BY r.created_at DESC
`;

    const [reviewRows] = await pool.query(reviewsSql, [experience.id]);

    const reviews = (reviewRows as any[]).map((review) => ({
      ...review,
      rating: Number(review.rating),
    }));

    // 成功找到，回傳單一商品物件
    res.json({
      status: "success",
      data: {
        ...experience,
        images,
        longitude:
          experience.longitude === null ? null : Number(experience.longitude),
        latitude:
          experience.latitude === null ? null : Number(experience.latitude),
        price: Number(experience.price),
        adult_price: Number(experience.adult_price),
        child_price: Number(experience.child_price),
        duration_minutes: Number(experience.duration_minutes),
        rating: Number(experience.rating),
        review_count: Number(experience.review_count),
        host_rating: Number(experience.host_rating),
        notes,
        sessions,
        reviews,
      },
    });
  } catch (error) {
    console.error("取得商品詳情失敗:", error);
    res.status(500).json({
      status: "error",
      message: "伺服器內部錯誤",
    });
  }
});

export default router;
