import nodemailer from "nodemailer";
import "dotenv/config";

// 重用組員已設定好的 SMTP 送信工具
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVoucherEmail(toEmail: string, orderData: { order_id: string; final_amount: number; title: string }) {
  if (!toEmail) return;

  const mailOptions = {
    from: `"Meet Locals 旅遊體驗" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `【Meet Locals】預訂成功憑證 - 訂單編號：${orderData.order_id}`,
    html: `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background:#f5f7fa; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 8px 25px rgba(0,0,0,.08);">
        <tr>
          <td align="center" style="background:#68BBC3; color:white; padding:35px;">
            <div style="font-size:42px;">✈️</div>
            <h1 style="margin:10px 0 0; font-size:28px;">預訂成功通知！</h1>
            <p style="margin-top:5px; font-size:15px; opacity:0.9;">感謝您使用 Meet Locals，祝您旅途愉快</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin-top:0; color:#333;">您的行程憑證已確認 🎉</h2>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin:20px 0;">
              <p style="margin:8px 0; color:#475569;"><strong>預訂行程：</strong> ${orderData.title}</p>
              <p style="margin:8px 0; color:#475569;"><strong>訂單編號：</strong> ${orderData.order_id}</p>
              <p style="margin:8px 0; color:#475569;"><strong>實付金額：</strong> NT$ ${orderData.final_amount.toLocaleString()}</p>
            </div>
            <p style="line-height:1.6; color:#64748b; font-size:14px;">
              您可以登入 Meet Locals 官網，前往「我的訂單」查看完整的 QR Code 電子憑證與行程細節。
            </p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}/member/order" 
                 style="background:#68BBC3; color:white; text-decoration:none; padding:14px 30px; display:inline-block; font-size:16px; font-weight:bold; border-radius:10px;">
                 查看我的訂單憑證
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="background:#fafafa; padding:20px; font-size:12px; color:#94a3b8;">
            © ${new Date().getFullYear()} Meet Locals All Rights Reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  };

  return transporter.sendMail(mailOptions);
}