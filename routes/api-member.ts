import express, { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";
import { authenticate } from "../middlewares/authenticate.js"; // 後端檢查登入權限的 middleware 有需要登入才能用的 api 請加上
import uploadImage from "../utils/upload-Image.js";
import { z } from "zod";
const router: Router = Router();

// 會員資料的格式驗證
// 空字串（""）會被轉成 null，資料庫就會存成 NULL。
const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "姓名不能是空白" })
    .max(50, { message: "姓名最多 50 個字" }),

  phone: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .trim()
      .regex(/^09\d{8}$/, {
        message: "手機格式錯誤，請輸入 09 開頭的 10 碼手機號碼",
      })
      .nullable(),
  ),

  // 這三個值要和 MySQL member.gender 的 ENUM 完全一致。
  gender: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .enum(["男", "女", "其他"], {
        message: "性別只能是「男」、「女」或「其他」",
      })
      .nullable(),
  ),

  birthday: z.preprocess(
    (value) => (value === "" ? null : value),
    z.iso
      .date({ message: "生日格式必須是 YYYY-MM-DD，例如 2000-05-10" })
      .refine((birthday) => birthday <= new Date().toISOString().slice(0, 10), {
        message: "生日不能是未來日期",
      })
      .nullable(),
  ),
});

const recentlyViewedSchema = z.object({
  experienceId: z.coerce.number().int().positive(),
});

// 取得會員資料
router.get("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    // authenticate 驗證成功後，req.user 一定會有資料
    const memberId = req.user!.id;

    // 根據 JWT 裡的會員 id 查詢資料庫
    const [members] = await pool.query(
      `
          SELECT
            id,
            name,
            email,
            phone,
            gender,
            DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
            avatar_url,
            member_level,
            current_points,
            total_spent,
            total_orders,
            role,
            city
          FROM member
          WHERE id = ?
        `,
      [memberId],
    );

    const member = (members as Record<string, unknown>[])[0];

    if (!member) {
      res.status(404).json({
        success: false,
        message: "找不到會員資料",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "會員資料取得成功",
      data: member,
    });
  } catch (error) {
    console.error("取得會員資料失敗：", error);

    res.status(500).json({
      success: false,
      message: "取得會員資料失敗",
    });
  }
});

// 修改會員資料
router.put("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    // 1. 從 JWT 取得目前登入者的 id
    // 不相信前端傳來的 memberId，避免使用者修改到別人的資料。
    const memberId = req.user!.id;

    // 2. 用 Zod 檢查前端送來的資料格式
    const zodResult = updateProfileSchema.safeParse(req.body);

    // 格式錯誤：立刻停止，不進資料庫
    if (!zodResult.success) {
      res.status(400).json({
        success: false,
        message: zodResult.error.issues[0].message,
        errors: zodResult.error.flatten().fieldErrors,
      });
      return;
    }

    // 3. 取得「驗證通過、整理過」的資料
    // 例如 phone: "" 已經被轉成 null。
    const { name, phone, gender, birthday } = zodResult.data;

    // 4. 更新目前登入會員的資料
    await pool.query(
      `
        UPDATE member
        SET
          name = ?,
          phone = ?,
          gender = ?,
          birthday = ?
        WHERE id = ?
      `,
      [name, phone, gender, birthday, memberId],
    );

    // 5. 再查一次更新後資料，回傳給前端
    // DATE_FORMAT 讓生日固定是 YYYY-MM-DD，前端可直接放進 input[type="date"]。
    const [members] = await pool.query(
      `
        SELECT
          id,
          name,
          email,
          phone,
          gender,
          DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
          avatar_url,
          member_level,
          current_points,
          total_spent,
          total_orders
        FROM member
        WHERE id = ?
      `,
      [memberId],
    );

    const member = (members as Record<string, unknown>[])[0];

    // 6. 回傳更新完成後的最新資料
    res.status(200).json({
      success: true,
      message: "會員資料更新成功",
      data: member,
    });
  } catch (error) {
    console.error("更新會員資料失敗：", error);

    res.status(500).json({
      success: false,
      message: "伺服器發生錯誤，請稍後再試",
    });
  }
});

// 會員大頭貼上傳、更新
router.post(
  "/avatar",
  authenticate,
  uploadImage.single("avatar"),
  async (req: Request, res: Response) => {
    // 前端 FormData 的欄位名稱必須叫做 avatar
    try {
      const memberId = req.user!.id;

      // 若前端沒傳檔案，req.file 會是 undefined
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "請上傳 JPG、PNG 或 WEBP 圖片",
        });
        return;
      }

      // upload-Image.ts 會存到 public/images
      // 因為 index.ts 已設定 express.static('public')
      // 瀏覽器可以用 /images/檔名 讀取此檔案
      const avatarUrl = `/avatars/${req.file.filename}`;

      // 只更新「目前登入者」自己的資料，不能由前端傳 memberId
      await pool.query(
        `
          UPDATE member
          SET avatar_url = ?
          WHERE id = ?
        `,
        [avatarUrl, memberId],
      );

      res.status(200).json({
        success: true,
        message: "大頭貼更新成功",
        data: {
          avatarUrl,
        },
      });
    } catch (error) {
      console.error("更新大頭貼失敗：", error);

      res.status(500).json({
        success: false,
        message: "更新大頭貼失敗",
      });
    }
  },
);

// 刪除大頭貼
router.delete("/avatar", authenticate, async (req: Request, res: Response) => {
    try {
      // authenticate 已驗證登入，並將會員 id 放到 req.user
      const memberId = req.user!.id;

      // 將目前登入會員的 avatar_url 清空為 NULL
      await pool.query(
        `
          UPDATE member
          SET avatar_url = NULL
          WHERE id = ?
        `,
        [memberId],
      );

      res.status(200).json({
        success: true,
        message: "已移除頭像，恢復預設頭像",
      });
    } catch (error) {
      console.error("移除會員頭像失敗：", error);

      res.status(500).json({
        success: false,
        message: "移除頭像失敗，請稍後再試",
      });
    }
  },
);

// 取得最近瀏覽資料
router.get(
  "/recently-viewed",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const memberId = req.user!.id;

      const [rows] = await pool.query(
        `
          SELECT
            e.id,
            e.title,
            e.city,
            c.category_name,

            -- experiences 沒有價格，價格從 sessions 取最小成人價格
            COALESCE(ps.adult_min_price, 0) AS price,

            -- 圖片從 experience_images 取主要圖片
            ci.image_url,

            -- 評價從 experience_reviews 計算
            COALESCE(rs.rating, 0) AS rating,
            COALESCE(rs.review_count, 0) AS review_count,

            rv.viewed_at

          FROM recently_viewed rv

          INNER JOIN experiences e
            ON e.id = rv.experience_id

          LEFT JOIN experience_categories c
            ON c.id = e.category_id

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
            ON ps.experience_id = e.id

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
            ON ci.experience_id = e.id

          LEFT JOIN (
            SELECT
              experience_id,
              ROUND(AVG(rating), 1) AS rating,
              COUNT(*) AS review_count
            FROM experience_reviews
            GROUP BY experience_id
          ) rs
            ON rs.experience_id = e.id

          WHERE rv.member_id = ?

          -- 最新瀏覽排最前面
          ORDER BY rv.viewed_at DESC, rv.id DESC

          -- 雙重保護：資料庫最多應保留 20 筆，API 也只回傳 20 筆
          LIMIT 20
        `,
        [memberId],
      );

      const items = (rows as Record<string, unknown>[]).map((item) => ({
        ...item,
        id: Number(item.id),
        price: Number(item.price),
        rating: Number(item.rating),
        review_count: Number(item.review_count),
      }));

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      console.error("[GET /api/member/recently-viewed]", error);

      res.status(500).json({
        success: false,
        message: "取得最近瀏覽資料失敗",
      });
    }
  },
);

// 加入最近瀏覽
router.post(
  "/recently-viewed",
  authenticate,
  async (req: Request, res: Response) => {
    const parsedResult = recentlyViewedSchema.safeParse(req.body);

    if (!parsedResult.success) {
      res.status(400).json({
        status: "error",
        message: "experienceId 必須是大於 0 的整數",
      });
      return;
    }

    const memberId = req.user!.id;
    const { experienceId } = parsedResult.data;

    try {
      // 先確認前端送來的體驗 ID 確實存在
      const [experienceRows] = await pool.query<{ id: number }[]>(
        `
          SELECT id
          FROM experiences
          WHERE id = ?
          LIMIT 1
        `,
        [experienceId],
      );

      if (experienceRows.length === 0) {
        res.status(404).json({
          status: "error",
          message: "找不到此體驗",
        });
        return;
      }

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        await connection.query(
          `
            INSERT INTO recently_viewed (
              member_id,
              experience_id,
              viewed_at
            )
            VALUES (?, ?, NOW())

            -- 同一會員再次瀏覽同一體驗時：
            -- 不新增第二筆，而是更新瀏覽時間。
            ON DUPLICATE KEY UPDATE
              viewed_at = NOW()
          `,
          [memberId, experienceId],
        );

        await connection.query(
          `
            DELETE rv
            FROM recently_viewed AS rv
            LEFT JOIN (
              SELECT id
              FROM (
                SELECT id
                FROM recently_viewed
                WHERE member_id = ?
                ORDER BY viewed_at DESC, id DESC
                LIMIT 20
              ) AS latest_twenty
            ) AS records_to_keep
              ON records_to_keep.id = rv.id

            WHERE rv.member_id = ?
              AND records_to_keep.id IS NULL
          `,
          [memberId, memberId],
        );

        await connection.commit();

        res.status(200).json({
          status: "success",
          message: "最近瀏覽已更新",
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("[POST /api/member/recently-viewed]", error);

      res.status(500).json({
        status: "error",
        message: "記錄最近瀏覽失敗",
      });
    }
  },
);

// 刪除最近瀏覽
router.delete(
  "/recently-viewed",
  authenticate,
  (req: Request, res: Response) => {},
);

// 取得心願清單
router.get("/favorites", authenticate, async (req: Request, res: Response) => {
  try {
    const memberId = req.user!.id;

    const [rows] = await pool.query(
      `
        SELECT
          e.id,
          e.title,
          e.city,
          c.category_name,

          COALESCE(ps.adult_min_price, 0) AS price,
          ci.image_url,

          COALESCE(rs.rating, 0) AS rating,
          COALESCE(rs.review_count, 0) AS review_count

        FROM favorites f

        INNER JOIN experiences e
          ON e.id = f.experience_id

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

        WHERE f.member_id = ?

        ORDER BY f.created_at DESC
      `,
      [memberId],
    );

    const favoriteItems = (rows as Record<string, unknown>[]).map((item) => ({
      ...item,
      id: Number(item.id),
      price: Number(item.price),
      rating: Number(item.rating),
      review_count: Number(item.review_count),
    }));

    const favoriteIds = favoriteItems.map((item) => item.id);

    res.status(200).json({
      status: "success",
      data: {
        favoriteIds,
        items: favoriteItems,
      },
    });
  } catch (error) {
    console.error("取得心願清單失敗：", error);

    res.status(500).json({
      status: "error",
      message: "取得心願清單失敗",
    });
  }
});

// 加入心願清單
router.post(
  "/favorites/:experienceId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const memberId = req.user!.id;
      const experienceId = Number(req.params.experienceId);

      if (!Number.isInteger(experienceId) || experienceId <= 0) {
        res.status(400).json({
          status: "error",
          message: "體驗編號不正確",
        });
        return;
      }

      await pool.query(
        `
          INSERT INTO favorites (member_id, experience_id)
          VALUES (?, ?)
        `,
        [memberId, experienceId],
      );

      res.status(201).json({
        status: "success",
        message: "已加入我的心願清單",
      });
    } catch (error) {
      const databaseError = error as { code?: string };

      if (databaseError.code === "ER_DUP_ENTRY") {
        res.status(409).json({
          status: "error",
          message: "此體驗已經加入心願清單",
        });
        return;
      }

      if (databaseError.code === "ER_NO_REFERENCED_ROW_2") {
        res.status(404).json({
          status: "error",
          message: "找不到此體驗",
        });
        return;
      }

      console.error("加入心願清單失敗：", error);

      res.status(500).json({
        status: "error",
        message: "加入心願清單失敗",
      });
    }
  },
);

// 從心願清單移除
router.delete(
  "/favorites/:experienceId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const memberId = req.user!.id;
      const experienceId = Number(req.params.experienceId);

      if (!Number.isInteger(experienceId) || experienceId <= 0) {
        res.status(400).json({
          status: "error",
          message: "體驗編號不正確",
        });
        return;
      }

      await pool.query(
        `
          DELETE FROM favorites
          WHERE member_id = ?
            AND experience_id = ?
        `,
        [memberId, experienceId],
      );
      res.status(200).json({
        status: "success",
        message: "已從心願清單移除",
      });
    } catch (error) {
      console.error("從心願清單移除失敗：", error);

      res.status(500).json({
        status: "error",
        message: "從心願清單移除失敗",
      });
    }
  },
);

export default router;
