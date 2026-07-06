import express, { type Request, type Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router: Router = Router();

// JWT 登入
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  // 1. 先判斷兩個欄位是不是都有值
  if (!email || !password) {
    res.json({ success: false, message: "帳號或密碼錯誤", code: 400 });
    return;
  }
  // 2. 帳號對不對
  const member = await prisma.member.findUnique({
    where: {
      email,
    },
  });
  if (!member) {
    res.json({ success: false, message: "帳號或密碼錯誤", code: 402 });
    return;
  }
  // 3. 密碼對不對
  const result = await bcrypt.compare(password, member.password_hash);
  if (result) {
    const { member_id, email, nickname } = member;
    // 回傳 JWT token (之前是寫入 session)
    const payload = { member_id, email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "JWT_KEY");
    res.json({ success: true, message: "登入成功", data: {id : member_id, email, nickname, token} });
  } else {
    res.json({ success: false, message: "帳號或密碼錯誤", code: 406 });
  }
});

// JWT 登出
router.post("/logout", (req: Request, res: Response) =>{

});

// 註冊
router.post("/register", (req: Request, res: Response) =>{

});

// 信箱驗證
router.post("/verify-email", (req: Request, res: Response) =>{

});

// 忘記密碼
router.post("/forget-password", (req: Request, res: Response) =>{

});

// 重設密碼
router.put("/reset-password", (req: Request, res: Response) =>{

});

// 修改密碼
router.put("/change-password", (req: Request, res: Response) =>{

});

// 第三方登入
router.post("/oauth-google", (req: Request, res: Response) =>{

});

// 刪除帳號???
router.delete("/delete-account", (req: Request, res: Response) =>{

});


export default router;
