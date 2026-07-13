
export function verifyEmailTemplate(name: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-TW">

<head>
  <meta charset="UTF-8" />
  <title>Meet Locals Email 驗證</title>
</head>

<body style="
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
  "
>

<!-- Header -->
<tr>
<td
  align="center"
  style="
    background:#68BBC3;
    color:white;
    padding:35px;
  "
>

<div style="font-size:42px;">✈️</div>

<h1 style="
  margin:10px 0 0;
  font-size:32px;
">
Meet Locals
</h1>

<p style="
  margin-top:10px;
  font-size:16px;
">
完成 Email 驗證，開始你的旅程
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
歡迎加入 <strong>Meet Locals</strong>！
<br><br>
為了保護您的帳號安全，
請先完成 Email 驗證。
</p>

<div style="
text-align:center;
margin:45px 0;
">

<a
href="${verifyUrl}"
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
✅ 驗證我的 Email
</a>

</div>

<p style="line-height:1.8;color:#555;">
若按鈕沒有反應，
請複製下方網址到瀏覽器：
</p>

<div
style="
background:#f4f4f4;
padding:14px;
border-radius:8px;
word-break:break-all;
font-size:14px;
color:#666;
"
>
${verifyUrl}
</div>

<hr style="
margin:35px 0;
border:none;
border-top:1px solid #eee;
">

<p style="color:#d97706;">
⏰ 此驗證連結將於
<strong>15 分鐘後失效</strong>
</p>

<p style="color:#666;">
若您沒有註冊Meet Locals帳號，
請直接忽略這封信即可。
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
"
>

<p style="margin:0;">
此信件由 <strong>Meet Locals</strong> 系統自動寄送，
請勿直接回覆。
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
