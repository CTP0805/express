import nodemailer from "nodemailer"
import jwt from "jsonwebtoken";
import "dotenv/config"
import { verifyEmailTemplate } from "./email-template.js";

type EmailVerifyPayload = {
  id: number;
  email: string;
  purpose: "email_verify";
};


// 產生信箱驗證 token
function createEmailVerifyToken(member: { id: number; email: string }) {
  const payload: EmailVerifyPayload = {
    id: member.id,
    email: member.email,
    purpose: "email_verify", // 說明目的 免得跟登入的 token 搞混
  };

  return jwt.sign(
    payload,
    process.env.EMAIL_VERIFY_SECRET || "EMAIL_VERIFY_KEY",
    {
      expiresIn: "15m", // 驗證信 15 分鐘內有效
    },
  );
}

// 建立寄信工具
// 可以把它想成「後端的郵差設定」
// 後端要先知道 SMTP 主機、帳號、密碼，才有辦法幫你寄信
const transporter = nodemailer.createTransport({
  service: "gmail",
  /* service: "gmail"　等同下面三行
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // 587 通常用 false；465 才通常用 true
  */
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 寄出驗證信
async function sendVerifyEmail(member: { id: number; name: string; email: string }) {
  const token = createEmailVerifyToken({
    id: member.id,
    email: member.email,
  });

  const backendOrigin = process.env.BACKEND_ORIGIN || "http://localhost:3002";

  // 使用者點信件連結時，瀏覽器會發 GET 請求到這個網址
  const verifyUrl = `${backendOrigin}/api/auth/verify-email?token=${token}`;

  // transporter.sendMail --> 真的把 email 寄出去
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: member.email,
    subject: "請完成信箱驗證",
    html: verifyEmailTemplate(member.name,verifyUrl),
  });
}

export default sendVerifyEmail;