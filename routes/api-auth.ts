import { type Request, type Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../utils/connect-mysql.js";
import { z } from "zod";
import sendVerifyEmail from "../utils/send-verify-email.js";
import sendResetPasswordEmail from "../utils/send-reset-email.js";
import "dotenv/config";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import { authenticate } from "../middlewares/authenticate.js";


const { FRONTEND_ORIGIN } = process.env;

const router: Router = Router();


// TypeScript 型別
type MemberRow = {
  id?: number;
  name?: string;
  email?: string;
  password_hash?: string;
  is_email_verified?: Date | null;
  google_uid?: string | null;
  avatar_url?: string | null;
  token_version?: number;
};

type EmailVerifyPayload = {
  id: number;
  email: string;
  purpose: "email_verify";
};

type ResetPasswordPayload = {
  id: number;
  email: string;
  purpose: "password_reset"; // 用來確認這個 token 是「重設密碼」用途
  token_version: number; // 建立 token 當下的版本號
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

const forgotPasswordSchema = z.object({
  email: z.email({
    message: "請輸入正確的 Email 格式",
  }),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, {
    message: "缺少重設密碼 token",
  }),

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
    const payload = { id, email, token_version: member[0].token_version ?? 1 }; // 把目前資料庫的 token_version 放進登入 JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET || "JWT_KEY", {
      expiresIn: "7d", // 設定過期時間(一天)
    });

    res.cookie("Kenny", token, {
      httpOnly: true,
      secure: false, // 本機 localhost 用 false；正式 HTTPS 上線要改 true
      sameSite: "lax" as const, // 跨網站請求時要不要帶 cookie
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 過期時間 7 天
    });

    res.status(200).json({
      success: true,
      message: "登入成功(後端)",
      data: { id, name, email }, // 這裡就不要再把 token 回應給前端，我們已經把 token 放在前端的 cookie 裡了
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
    sameSite: "lax" as const, // 正式 HTTPS 上線要改 "none"
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "登出成功(後端)",
  });
});

// 取得並驗證目前使用者是誰
// 前端重新整理頁面時，會呼叫這支 API，瀏覽器會自動帶上 HttpOnly Cookie 裡的 Kenny JWT。
router.get("/me", authenticate, async (req: Request, res: Response) => {
  // authenticate 已驗證過 JWT，因此這裡理論上一定有 user。
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "尚未登入",
    });
    return;
  }

  // 重新從資料庫拿目前會員資料
  const [members] = await pool.query<MemberRow[]>(
    `
      SELECT id, name, email
      FROM member
      WHERE id = ?
    `,
    [req.user.id],
  );

  const member = members[0];

  if (!member?.id || !member.email) {
    res.status(401).json({
      success: false,
      message: "找不到會員資料",
    });
    return;
  }

  // 前端收到這份資料後，就知道目前已登入。
  res.status(200).json({
    success: true,
    data: {
      id: member.id,
      name: member.name || "",
      email: member.email,
    },
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
    await sendVerifyEmail(memberId, name, email);
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
// TODO : 尚未信箱驗證的帳號可以忘記密碼嗎????
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;

  // --------------------------------
  // step1. 驗證前端傳來的 Email 格式
  // --------------------------------
  const zodResult = forgotPasswordSchema.safeParse({
    email,
  });

  if (!zodResult.success) {
    res.status(400).json({
      success: false,
      message: zodResult.error.issues[0].message,
    });
    return;
  }

  // 統一轉成小寫，避免 User@Example.com
  // 和 user@example.com 被當成不同帳號
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // --------------------------------
    // step2. 查詢會員是否存在
    // --------------------------------
    const findMemberSql = `
        SELECT id, name, email, token_version
        FROM member
        WHERE email = ?
      `;

    const [members] = await pool.query<MemberRow[]>(findMemberSql, [
      normalizedEmail,
    ]);

    // --------------------------------
    // step3. 不論會員存在或不存在
    // 都回傳同樣的成功訊息
    //
    // 這樣可以避免攻擊者測試：
    // 某個 Email 到底有沒有註冊
    // --------------------------------
    if (members.length === 0) {
      res.status(200).json({
        success: true,
        message: "若此 Email 存在，我們已寄送重設密碼信",
      });
      console.log("❌ 密碼重設信發送錯誤 : 查無此使用者")
      return;
    }

    const member = members[0];

    // 理論上 id、email、token_version 一定存在
    // 這裡是為了讓 TypeScript 確認資料安全
    if (!member.id || !member.email) {
      res.status(200).json({
        success: true,
        message: "若此 Email 存在，我們已寄送重設密碼信",
      });
      return;
    }

    // 如果資料庫欄位是 NULL 或舊資料沒有值
    // 就使用 1 當作預設版本
    // const currentTokenVersion = member.token_version ?? 1;

    // --------------------------------
    // step4. 寄送重設密碼 Email
    // --------------------------------

    await sendResetPasswordEmail( member.id, member.name || "會員", member.email, member.token_version);

    // --------------------------------
    // step5. 回傳前端
    // --------------------------------
    res.status(200).json({
      success: true,
      message: "若此 Email 存在，我們已寄送重設密碼信",
    });
    console.log("🎯 密碼重設信發送成功")
  } catch (error) {
    console.warn("forgot-password error:", error);

    // 不把 Email 寄送錯誤細節回傳給前端
    // 避免洩漏 SMTP 或系統資訊
    res.status(200).json({
      success: true,
      message: "若此 Email 存在，我們已寄送重設密碼信",
    });
  }
});

// GET /api/auth/reset-password?token=xxx
//
// 使用者點擊 Email 連結後，會先進入這裡。
// 這裡不負責修改密碼，只負責檢查 token。
// 檢查完成後，再導向前端的重設密碼頁面。
// 驗證重設連結
router.get("/reset-password", async (req: Request, res: Response) => {
  const token = String(req.query.token || "");

  // 沒有 token
  if (!token) {
    res.redirect(
      `${FRONTEND_ORIGIN}/auth/reset-password?valid=false&message=missing-token`,
    );
    return;
  }

  try {
    // --------------------------------
    // step1. 驗證 JWT
    //
    // jwt.verify 會自動檢查：
    // 1. token 是否被竄改
    // 2. token 是否過期
    // --------------------------------
    const payload = jwt.verify(
      token,
      process.env.RESET_PASSWORD_SECRET || "RESET_PASSWORD_KEY",
    ) as ResetPasswordPayload;

    // --------------------------------
    // step2. 確認 token 用途
    // 防止拿信箱驗證 token 來重設密碼
    // --------------------------------
    if (payload.purpose !== "password_reset") {
      res.redirect(
        `${FRONTEND_ORIGIN}/auth/reset-password?valid=false&message=wrong-purpose`,
      );
      return;
    }

    // --------------------------------
    // step3. 查詢會員目前的 token_version
    // --------------------------------
    const findMemberSql = `
        SELECT id, email, token_version
        FROM member
        WHERE id = ? AND email = ?
      `;

    const [members] = await pool.query<MemberRow[]>(findMemberSql, [
      payload.id,
      payload.email,
    ]);

    if (members.length === 0) {
      res.redirect(
        `${FRONTEND_ORIGIN}/auth/reset-password?valid=false&message=member-not-found`,
      );
      return;
    }

    const currentTokenVersion = members[0].token_version ?? 1;

    // --------------------------------
    // step4. 確認 token_version 沒有改變
    //
    // 如果使用者已經重設過密碼：
    // DB token_version = 2
    // 舊 token token_version = 1
    //
    // 代表這個 token 已經失效
    // --------------------------------
    if (payload.token_version !== currentTokenVersion) {
      res.redirect(
        `${FRONTEND_ORIGIN}/auth/reset-password?valid=false&message=token-used`,
      );
      return;
    }

    // token 有效，導向前端重設密碼頁
    res.redirect(
      `${FRONTEND_ORIGIN}/auth/reset-password?valid=true&token=${encodeURIComponent(token)}`,
    );
  } catch (error) {
    console.warn("reset-password GET error:", error);

    // JWT 過期、格式錯誤、簽章錯誤都會進入這裡
    res.redirect(
      `${FRONTEND_ORIGIN}/auth/reset-password?valid=false&message=invalid-or-expired`,
    );
  }
});

// PUT /api/auth/reset-password
//
// 前端送出：
// {
//   "token": "Email 裡面的 token",
//   "password": "NewPassword123"
// }
// 重設密碼
router.put("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;

  // --------------------------------
  // step1. 驗證前端欄位格式
  // --------------------------------
  const zodResult = resetPasswordSchema.safeParse({
    token,
    password,
  });

  if (!zodResult.success) {
    res.status(400).json({
      success: false,
      message: zodResult.error.issues[0].message,
    });
    return;
  }

  try {
    // --------------------------------
    // step2. 驗證 token
    // --------------------------------
    const payload = jwt.verify(
      token,
      process.env.RESET_PASSWORD_SECRET || "RESET_PASSWORD_KEY",
    ) as ResetPasswordPayload;

    // --------------------------------
    // step3. 確認 token 用途
    // --------------------------------
    if (payload.purpose !== "password_reset") {
      res.status(400).json({
        success: false,
        message: "重設密碼 token 用途錯誤",
      });
      return;
    }

    // --------------------------------
    // step4. 查詢會員目前資料
    // --------------------------------
    const findMemberSql = `
        SELECT id, email, token_version
        FROM member
        WHERE id = ? AND email = ?
      `;

    const [members] = await pool.query<MemberRow[]>(findMemberSql, [
      payload.id,
      payload.email,
    ]);

    if (members.length === 0) {
      res.status(400).json({
        success: false,
        message: "重設密碼連結無效(無此會員)",
      });
      return;
    }

    const member = members[0];
    const currentTokenVersion = member.token_version ?? 1;

    // --------------------------------
    // step5. 確認 token 尚未使用
    //
    // token_version 不相同，
    // 代表密碼已經重設過，或所有登入狀態已被撤銷
    // --------------------------------
    if (payload.token_version !== currentTokenVersion) {
      res.status(400).json({
        success: false,
        message: "重設密碼連結已失效，請重新申請",
      });
      return;
    }

    // --------------------------------
    // step6. 將新密碼雜湊
    // --------------------------------
    const hashedPassword = await bcrypt.hash(password, 10);

    // --------------------------------
    // step7. 更新密碼，同時讓 token_version + 1
    //
    // token_version + 1 有兩個作用：
    // 1. 讓這次 reset token 失效
    // 2. 讓所有舊登入 JWT 失效
    // --------------------------------
    const updatePasswordSql = `
        UPDATE member
        SET
          password_hash = ?,
          token_version = token_version + 1,
          updated_at = NOW()
        WHERE
          id = ?
          AND email = ?
          AND token_version = ?
      `;

    const [updateResult] = await pool.query(updatePasswordSql, [
      hashedPassword,
      payload.id,
      payload.email,
      currentTokenVersion,
    ]);

    const affectedRows = (updateResult as { affectedRows: number })
      .affectedRows;

    // 如果 affectedRows = 0
    // 代表在更新前 token_version 已被其他請求修改
    if (affectedRows === 0) {
      res.status(400).json({
        success: false,
        message: "重設密碼連結已失效，請重新申請",
      });
      return;
    }

    // 清掉目前瀏覽器可能存在的登入 Cookie
    res.clearCookie("Kenny", {
      httpOnly: true,
      secure: false,
      sameSite: "lax" as const,
      path: "/",
    });

    // --------------------------------
    // step8. 回傳前端
    // --------------------------------
    res.status(200).json({
      success: true,
      message: "密碼已更新，請重新登入",
    });
    
  } catch (error) {
    console.warn("reset-password PUT error:", error);

    res.status(400).json({
      success: false,
      message: "重設密碼連結無效或已過期",
    });
  }
});

// 修改密碼
router.put("/change-password", authenticate, (req: Request, res: Response) => {
  
});

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
      `SELECT id, name, email, google_uid, avatar_url, token_version
        FROM member
        WHERE google_uid = ?`,
      [googleUid],
    );

    // step2. 再用 email 找會員
    const [emailMembers] = await pool.query<MemberRow[]>(
      `SELECT id, name, email, google_uid, avatar_url, token_version
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
        `SELECT id, name, email, google_uid, avatar_url, token_version
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
        `SELECT id, name, email, google_uid, avatar_url, token_version
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
      token_version: member.token_version ?? 1,
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
router.delete("/delete-account", authenticate, (req: Request, res: Response) => {});

export default router;
