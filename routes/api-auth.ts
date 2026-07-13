import { type Request, type Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../utils/connect-mysql.js";
import { z } from "zod";
import sendVerifyEmail from "../utils/send-email.js";
import "dotenv/config";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";

const router: Router = Router();
const { FRONTEND_ORIGIN } = process.env;

// TypeScript 型別
type MemberRow = {
  id?: number;
  name?: string;
  email?: string;
  password_hash?: string;
  is_email_verified?: Date | null;
  google_uid?: string | null;
  avatar_url?: string | null;
};

type EmailVerifyPayload = {
  id: number;
  email: string;
  purpose: "email_verify";
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

  // step3. 信箱沒驗證不能登入
  if (!member[0].is_email_verified) {
    res.status(403).json({
      success: false,
      message: "請先完成信箱驗證，再進行登入",
    });
    return;
  }

  // step4. 密碼對不對
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
      res
        .status(400)
        .json({ success: false, message: zodResult.error.issues[0].message });
      return;
    }
  }

  // step2. 確認此 email 沒有被註冊過
  const checkEmailSql = `SELECT id FROM member WHERE email = ? `;
  const [existingMember] = await pool.query<MemberRow[]>(checkEmailSql, [
    email,
  ]);

  if (existingMember.length) {
    res.status(409).json({ success: false, message: "此email已註冊過" });
    return;
  }

  // step3. 密碼雜湊
  const hashedPassword = await bcrypt.hash(password, 10);

  // step4. 寫進資料庫
  const sql = `INSERT INTO member (name, email, password_hash,created_at) VALUES (?,?,?,now())`;
  try {
    const [rows] = await pool.query(sql, [name, email, hashedPassword]);

    // mysql2 的 insertResult 會有 insertId ????
    const memberId = (rows as { insertId: number }).insertId;

    // step5. 註冊成功後，寄出驗證信
    await sendVerifyEmail({
      id: memberId,
      name,
      email,
    });
    if (rows) {
      // 狀態碼待確認
      res.status(200).json({
        success: true,
        message: "註冊成功，已發送驗證信，請至信箱完成驗證(後端)",
      });
    }
  } catch (error) {
    console.warn(error);
    // 狀態碼待確認
    res.status(500).json({ success: false, message: "註冊失敗(後端)" });
  }
});

// 信箱驗證
router.get("/verify-email", async (req: Request, res: Response) => {
  const token = String(req.query.token || "");

  // 沒有 token
  if (!token) {
    res.redirect(
      `${FRONTEND_ORIGIN}/auth/verify-email?success=false&message=missing-token`,
    );
    /*
    res.status(400).json({
      success: false,
      message: "缺少驗證 token",
    });
    */
    return;
  }

  try {
    // step1. 驗證 token 是否正確、是否過期
    const payload = jwt.verify(
      token,
      process.env.EMAIL_VERIFY_SECRET || "EMAIL_VERIFY_KEY",
    ) as EmailVerifyPayload;

    // step2. 確認這個 token 真的是拿來做信箱驗證的
    if (payload.purpose !== "email_verify") {
      res.redirect(
        `${FRONTEND_ORIGIN}/auth/verify-email?success=false&message=wrong-purpose`,
      );
      /*
      res.status(400).json({
        success: false,
        message: "驗證 token 用途錯誤",
      });
      */
      return;
    }

    // step3. 檢查會員是否存在
    const findSql = `
      SELECT id, email, is_email_verified
      FROM member
      WHERE id = ? AND email = ?
    `;

    const [members] = await pool.query<MemberRow[]>(findSql, [
      payload.id,
      payload.email,
    ]);

    if (members.length === 0) {
      res.redirect(
        `${FRONTEND_ORIGIN}/auth/verify-email?success=false&message=member-not-found`,
      );
      /*
      res.status(404).json({
        success: false,
        message: "找不到會員資料",
      });
      */
      return;
    }

    // step4. 如果已經驗證過，就不用重複更新
    if (members[0].is_email_verified) {
      res.redirect(
        `${FRONTEND_ORIGIN}/auth/verify-email?success=true&already=true`,
      );
      /*
      res.status(200).json({
        success: true,
        message: "此信箱已經驗證過",
      });
      */
      return;
    }

    // step5. 更新 is_email_verified
    // NOW() 會把目前資料庫時間寫進欄位
    const updateSql = `
      UPDATE member
      SET is_email_verified = NOW(),
          updated_at = NOW()
      WHERE id = ? AND email = ?
    `;

    await pool.query(updateSql, [payload.id, payload.email]);

    // 如果你想要點完信後跳回前端頁面，可以改用 res.redirect()
    // const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
    // res.redirect(`${frontendOrigin}/login?emailVerified=success`);
    // return;

    res.redirect(`${FRONTEND_ORIGIN}/auth/verify-email?success=true`);
    /*
    res.status(200).json({
      success: true,
      message: "信箱驗證成功",
    });
    */
  } catch (error) {
    console.warn(error);
    res.redirect(
      `${FRONTEND_ORIGIN}/auth/verify-email?success=false&message=invalid-or-expired`,
    );
    /*
    res.status(400).json({
      success: false,
      message: "驗證連結無效或已過期，請重新註冊或重新發送驗證信",
    });
    */
  }
});

// 忘記密碼
router.post("/forgot-password", (req: Request, res: Response) => {});

// 重設密碼
router.put("/reset-password", (req: Request, res: Response) => {});

// 修改密碼
router.put("/change-password", (req: Request, res: Response) => {});

// 第三方登入：Google
// 這段參考 Eddy 範例的 /google-login：
// 1. 前端用 Firebase 拿 Google 使用者資料
// 2. 後端用 email / google uid 判斷會員是否存在
// 3. 有會員就登入，沒有會員就建立會員
// 4. 最後發 JWT Cookie 給前端
router.post("/oauth-google", async (req: Request, res: Response) => {
  const { providerId, displayName, email, uid, photoURL } = req.body;

  // 後端收什麼？
  // providerId: "google.com"
  // uid: Google/Firebase 給這個使用者的唯一 ID
  // email: Google 帳號信箱
  // displayName: Google 顯示名稱
  // photoURL: Google 頭像
  if (!providerId || !uid || !email) {
    res.status(400).json({
      success: false,
      message: "缺少 Google 登入資料",
    });
    return;
  }

  if (providerId !== "google.com") {
    res.status(400).json({
      success: false,
      message: "不是 Google 登入資料",
    });
    return;
  }

  const googleUid = String(uid);

  try {
    // step1. 先用 google_uid 找會員
    const [googleMembers] = await pool.query<MemberRow[]>(
      `SELECT id, name, email, google_uid, avatar_url
       FROM member
       WHERE google_uid = ?`,
      [googleUid],
    );

    // step2. 再用 email 找會員
    const [emailMembers] = await pool.query<MemberRow[]>(
      `SELECT id, name, email, google_uid, avatar_url
       FROM member
       WHERE email = ?`,
      [email],
    );

    let member: MemberRow | undefined = undefined;

    // 情境 A：google_uid 已經存在，代表之前用 Google 登入過
    if (googleMembers.length > 0) {
      member = googleMembers[0];
    }

    // 情境 B：email 已存在，但 google_uid 還沒綁定
    // 例如使用者以前用 email 註冊，現在第一次按 Google 登入
    if (!member && emailMembers.length > 0) {
      await pool.query(
        `UPDATE member
         SET google_uid = ?,
             avatar_url = ?,
             is_email_verified = COALESCE(is_email_verified, NOW()),
             updated_at = NOW()
         WHERE email = ?`,
        [googleUid, photoURL || null, email],
      );

      const [updatedMembers] = await pool.query<MemberRow[]>(
        `SELECT id, name, email, google_uid, avatar_url
         FROM member
         WHERE email = ?`,
        [email],
      );

      member = updatedMembers[0];
    }

    // 情境 C：google_uid 沒有，email 也沒有
    // 代表這是全新的 Google 使用者，幫他建立一筆會員資料
    if (!member) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const [insertResult] = await pool.query(
        `INSERT INTO member
          (name, email, password_hash, google_uid, avatar_url, is_email_verified, created_at, updated_at)
         VALUES
          (?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          displayName || email,
          email,
          passwordHash,
          googleUid,
          photoURL || null,
        ],
      );

      const memberId = (insertResult as { insertId: number }).insertId;

      const [newMembers] = await pool.query<MemberRow[]>(
        `SELECT id, name, email, google_uid, avatar_url
         FROM member
         WHERE id = ?`,
        [memberId],
      );

      member = newMembers[0];
    }

    if (!member || !member.id) {
      res.status(500).json({
        success: false,
        message: "Google 登入失敗，找不到會員資料",
      });
      return;
    }

    // step4. 發 JWT
    // 跟你原本 /login 一樣，寫進 Kenny 這個 HttpOnly Cookie
    const payload = {
      id: member.id,
      email: member.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || "JWT_KEY", {
      expiresIn: "7d",
    });

    res.cookie("Kenny", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // 後端回什麼？
    // 回傳登入成功訊息與會員資料
    res.status(200).json({
      success: true,
      message: "Google 登入成功",
      data: {
        id: member.id,
        name: member.name,
        email: member.email,
        token,
      },
    });
  } catch (error) {
    console.warn(error);

    res.status(500).json({
      success: false,
      message: "Google 登入失敗",
    });
  }
});

// 刪除帳號???
router.delete("/delete-account", (req: Request, res: Response) => {});

export default router;
