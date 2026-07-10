import express, { type Request, type Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../utils/connect-mysql.js";
import { success, z } from "zod";
import cookieParser from "cookie-parser";

const router: Router = Router();

type MemberRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
};

// 格式驗證專區
const loginSchema = z.object({
  account: z.email({ message: "請輸入正確的 Email 格式" }),
  password: z.string().min(8, { message: "密碼至少需要 8 個字" }),
});

const registerSchema = z.object({
  name: z.string().trim().min(1, {
    message: "請輸入姓名",
  }),
  email: z.email({ message: "請輸入正確的 Email 格式" }),
  password: z
    .string()
    .min(8, {
      message: "密碼至少需要 8 個字",
    })
    .regex(/[A-Za-z]/, {
      message: "密碼必須包含英文",
    })
    .regex(/\d/, {
      message: "密碼必須包含數字",
    }),
});

// JWT 登入
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  // step1. 後端格式驗證


  // 先判斷兩個欄位是不是都有值
  if (!email || !password) {
    res.status(400).json({ success: false, message: "請填寫帳號或密碼(後端)" });
    return;
  }

  // step2. 帳號對不對
  const sql = `SELECT * FROM member WHERE email = ?`;
  const [member] = await pool.query<MemberRow[]>(sql, [email]);
  console.log(member);

  if (member.length === 0) {
    res.status(401).json({ success: false, message: "帳號或密碼錯誤(後端)" });
    return;
  }

  // step3. 密碼對不對
  const result = await bcrypt.compare(password, member[0].password_hash);
  if (result) {
    const { id, name, email } = member[0];
    // 回傳 JWT token (之前是寫入 session)
    const payload = { id, email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "JWT_KEY", {
      expiresIn: "7d", // 設定過期時間(一天)
    });

    res.cookie("Kenny", token, {
      httpOnly: true,
      secure: false, // 本機 localhost 用 false；正式 HTTPS 上線要改 true
      sameSite: "lax" as const,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 過期時間
    });

    res.status(200).json({
      success: true,
      message: "登入成功(後端)",
      data: { id, name, email, token },
    });
  } else {
    res.status(406).json({ success: false, message: "帳號或密碼錯誤(後端)" });
  }
});

// JWT 登出
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("Kenny", {
    httpOnly: true,
    secure: false, // 本機 localhost 用 false；正式 HTTPS 上線要改 true
    sameSite: "lax" as const,
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "登出成功(後端)",
  });
});

// 註冊
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  // step1. 後端格式驗證
  const zodResult = registerSchema.safeParse({
      name,
      email,
      password,
    });

    // 狀態碼待確認
  if (!zodResult.success) {
    if (zodResult.error?.issues?.length) {
      res.json(zodResult.error.issues[0].message);
      return;
    }
  }
  
  // step2. 確認此 email 沒有被註冊過
  const checkEmailSql = `SELECT id FROM member WHERE email = ? `;
  const [existingMember] = await pool.query<MemberRow[]>(checkEmailSql, [email]);

  if (existingMember.length) {
    res.status(409).json({ success: false, message: "此email已註冊過" });
    return;
  }

  // step3. 密碼雜湊
  const hashedPassword = await bcrypt.hash(password, 10);

  // step4. 寫進資料庫
  const sql = `INSERT INTO member (name, email, password_hash) VALUES (?,?,?)`;
  try {
    const [rows] = await pool.query(sql, [name, email, hashedPassword]);
    if (rows) {
      // 狀態碼待確認
      res.status(200).json({ success: true, message: "註冊成功，已發送驗證信(後端)" });
    }
  } catch (error) {
    console.warn(error);
    // 狀態碼待確認
    res.status(500).json({ success: false, message: "註冊失敗(後端)" });
  }

});

// TODO : 註冊後要進行信箱驗證 確認這個信箱是可以使用的 要發送email給使用者確認
router.post("/verify-email",  (req: Request, res: Response) => {
  
});

// 忘記密碼
router.post("/forgot-password", (req: Request, res: Response) => {});

// 重設密碼
router.put("/reset-password", (req: Request, res: Response) => {});

// 修改密碼
router.put("/change-password", (req: Request, res: Response) => {});

// 第三方登入
router.post("/oauth-google", (req: Request, res: Response) => {});

// 刪除帳號???
router.delete("/delete-account", (req: Request, res: Response) => {});

export default router;
