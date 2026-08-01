import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { EmailTemplate } from "./email-template.js";

// TS 型別
type ResetPasswordPayload = {
  id: number;
  email: string;
  purpose: "password_reset"; // 用來確認這個 token 是「重設密碼」用途
  token_version: number; // 建立 token 當下的版本號
};

// 產生重設密碼 token
// 1. 會員 id
// 2. 會員 email
// 3. token_version
//
// expiresIn: "15m"
// 代表這個 token 只有 15 分鐘有效
// --------------------------------
async function createResetPasswordToken(
  id: number,
  email: string,
  token_version: number,
) {
  
  const payload: ResetPasswordPayload = {
    id,
    email,
    purpose: "password_reset", // 說明目的
    token_version,
  };

  return jwt.sign(
    payload,
    process.env.RESET_PASSWORD_SECRET || "RESET_PASSWORD_KEY",
    {
      expiresIn: "15m",
    },
  );
}

// 建立寄信工具
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 寄出重設信
async function sendResetPasswordEmail(id: number, name: string, email: string, token_version: number) {
  
  const token = await createResetPasswordToken(id, email, token_version);

  const backendOrigin = process.env.BACKEND_ORIGIN || "http://localhost:3001";

  // 使用者點擊這個連結後，
  // 會先進入後端 GET /api/auth/reset-password
  const resetUrl = `${backendOrigin}/api/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "重設密碼通知",
    html: EmailTemplate("reset-password", name, resetUrl),
  });
}

export default sendResetPasswordEmail;
