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
      .regex(/^09\d{8}$/, { message: "手機格式錯誤，請輸入 09 開頭的 10 碼手機號碼" })
      .nullable(),
  ),

  // 這三個值要和 MySQL member.gender 的 ENUM 完全一致。
  gender: z.preprocess(
    (value) => (value === "" ? null : value),
    z.enum(["男", "女", "其他"], {
      message: "性別只能是「男」、「女」或「其他」",
    }).nullable(),
  ),

  birthday: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .iso
      .date({ message: "生日格式必須是 YYYY-MM-DD，例如 2000-05-10" })
      .refine((birthday) => birthday <= new Date().toISOString().slice(0, 10), {
        message: "生日不能是未來日期",
      })
      .nullable(),
  ),
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
            total_orders
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
  },
);

// 修改會員資料
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
router.post("/avatar", authenticate, uploadImage.single("avatar"), async (req: Request, res: Response) => {
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

}
);

// 取得最近瀏覽資料
router.get("/recently-viewed", authenticate, (req: Request, res: Response) => {
  
});

// 加入最近瀏覽
router.post("/recently-viewed", authenticate, (req: Request, res: Response) => {
  
});

// 刪除最近瀏覽
router.delete("/recently-viewed", authenticate, (req: Request, res: Response) => {
  
});

export default router;
