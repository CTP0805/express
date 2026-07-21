import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import pool from "../utils/connect-mysql.js";

// JWT 裡面會放的資料格式
export type LoginJwtPayload = JwtPayload & {
  id: number;
  email: string;
  token_version: number;
};

// 告訴 TypeScript：req.user 可能存在
declare global {
  namespace Express {
    interface Request {
      user?: LoginJwtPayload;
    }
  }
}

// 驗證會員是否登入的 middleware
export async function authenticate( req: Request, res: Response, next: NextFunction ) {
  try {
    // 從 Cookie 取出登入時設定的 Kenny
    //
    // 你的登入程式目前是：
    // res.cookie("Kenny", token, ...)
    const token = req.cookies?.Kenny;

    // 如果 Cookie 不存在，代表使用者沒有登入
    if (!token) {
      res.status(401).json({
        success: false,
        message: "請先登入",
      });
      return;
    }

    // 驗證 JWT：
    // 1. 確認 token 有沒有被竄改
    // 2. 確認 token 有沒有過期
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "JWT_KEY",
    );

    // jwt.verify 回傳的結果可能是字串，也可能是物件
    // 我們只接受物件格式
    if (typeof decoded !== "object" || decoded === null) {
      res.status(401).json({
        success: false,
        message: "登入資訊格式錯誤",
      });
      return;
    }

    // 檢查 JWT 裡面必要的資料是否存在
    if (
      typeof decoded.id !== "number" ||
      typeof decoded.email !== "string" ||
      typeof decoded.token_version !== "number"
    ) {
      res.status(401).json({
        success: false,
        message: "登入資訊不完整",
      });
      return;
    }

    // 轉成我們定義的 JWT 格式
    const user = decoded as LoginJwtPayload;

    // 查詢資料庫目前這個會員的 token_version
    const [members] = await pool.query<{ token_version: number }[]>(
      `
        SELECT token_version
        FROM member
        WHERE id = ?
      `,
      [user.id],
    );

    const currentMember = members[0];

    // 如果查不到會員，代表會員不存在
    if (!currentMember) {
      res.status(401).json({
        success: false,
        message: "會員不存在",
      });
      return;
    }

    // JWT 裡的版本號，必須和資料庫目前版本號相同
    //
    // 例如：
    // JWT token_version = 1
    // DB  token_version = 2
    //
    // 代表這張 JWT 已經被作廢
    if (currentMember.token_version !== user.token_version) {
      res.status(401).json({
        success: false,
        message: "登入已失效，請重新登入",
      });
      return;
    }

    // 驗證成功，把會員資料放到 req.user
    // 後面的路由就可以使用 req.user.id
    req.user = user;

    // 允許請求繼續往下一個 route handler
    next();
  } catch (error) {
    // JWT 過期、被竄改、格式錯誤，都會跑到這裡
    console.warn("JWT 驗證失敗：", error);

    res.status(401).json({
      success: false,
      message: "登入資訊無效或已過期",
    });
  }
}
