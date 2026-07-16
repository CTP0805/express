type EmailTemplateType = "verify-email" | "reset-password";

export function EmailTemplate(
  type: EmailTemplateType,
  name: string,
  actionUrl: string
): string {
  // 根據用途決定不同內容
  const isVerify = type === "verify-email";

  const title = isVerify
    ? "完成 Email 驗證，開始你的旅程"
    : "重設您的帳號密碼";


  const description = isVerify
    ? `
      歡迎加入 <strong>Meet Locals</strong>！<br><br>
      為了保護您的帳號安全，
      請先完成 Email 驗證。
    `
    : `
      我們收到一筆重設密碼的申請。<br><br>
      若這是您本人操作，
      請點擊下方按鈕重新設定密碼。
    `;

  const buttonText = isVerify
    ? "✅ 驗證我的 Email"
    : "🔑 前往重設密碼";

  const expireText = isVerify
    ? "此驗證連結將於 <strong>15 分鐘後失效</strong>"
    : "此重設密碼連結將於 <strong>15 分鐘後失效</strong>";

  const ignoreText = isVerify
    ? "若您沒有註冊 Meet Locals 帳號，請直接忽略此信件即可。"
    : "若您沒有申請重設密碼，請直接忽略此信件，您的密碼不會被修改。";

  return `
<!DOCTYPE html>
<html lang="zh-TW">

<head>
<meta charset="UTF-8">
<title>Meet Locals</title>
</head>

<body
style="
margin:0;
padding:0;
background:#f5f7fa;
font-family:Arial,'Microsoft JhengHei',sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table
width="600"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
border-radius:18px;
overflow:hidden;
box-shadow:0 8px 25px rgba(0,0,0,.08);
">

<!-- Header -->
<tr>
<td
align="center"
style="
background:#68BBC3;
color:white;
padding:35px;
">

<div style="font-size:42px;">✈️</div>

<h1
style="
margin:10px 0 0;
font-size:32px;
">
Meet Locals
</h1>

<p
style="
margin-top:10px;
font-size:16px;
">
${title}
</p>

</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:45px;">

<h2 style="margin-top:0;">
Hi ${name} 👋
</h2>

<p style="line-height:1.8;color:#444;">
${description}
</p>

<div
style="
text-align:center;
margin:45px 0;
">

<a
href="${actionUrl}"
style="
background:#68BBC3;
color:white;
text-decoration:none;
padding:16px 38px;
display:inline-block;
font-size:18px;
font-weight:bold;
border-radius:10px;
">
${buttonText}
</a>

</div>

<p
style="
line-height:1.8;
color:#555;
">
若按鈕沒有反應，請複製下方網址到瀏覽器：
</p>

<div
style="
background:#f4f4f4;
padding:14px;
border-radius:8px;
word-break:break-all;
font-size:14px;
color:#666;
">
${actionUrl}
</div>

<hr
style="
margin:35px 0;
border:none;
border-top:1px solid #eee;
">

<p style="color:#d97706;">
⏰ ${expireText}
</p>

<p style="color:#666;">
${ignoreText}
</p>

</td>
</tr>

<!-- Footer -->
<tr>
<td
align="center"
style="
background:#fafafa;
padding:30px;
font-size:13px;
color:#888;
">

<p style="margin:0;">
此信件由 <strong>Meet Locals</strong> 系統自動寄送，請勿直接回覆。
</p>

<p style="margin-top:10px;">
© ${new Date().getFullYear()} Meet Locals All Rights Reserved.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}