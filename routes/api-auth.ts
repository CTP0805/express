import express, { type Request, type Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../utils/connect-mysql.js";

const router: Router = Router();

// JWT 登入
router.post("/login", async (req: Request, res: Response) => {
  const { account, password } = req.body;
  // 1. 先判斷兩個欄位是不是都有值
  if (!account || !password) {
    res.status(400).json({ success: false, message: "請填寫帳號或密碼(後端)"});
    return;
  }
  // 2. 帳號對不對
  const sql = `SELECT * FROM member WHERE email = ?`
  const [member] = await pool.query(sql, [account]);
  console.log(member);
  
  if (!member) {
    res.status(402).json({ success: false, message: "帳號或密碼錯誤(後端)"});
    return;
  }
  
  // 3. 密碼對不對
  const result = await bcrypt.compare(password, member[0].password_hash);
  if (result) {
    const { id, name, email } = member[0];
    // 回傳 JWT token (之前是寫入 session)
    const payload = { id, email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "JWT_KEY");
    res.status(200).json({ success: true, message: "登入成功(後端)", data: {id, name, email, token} });
  } else {
    res.status(406).json({ success: false, message: "帳號或密碼錯誤(後端)" });
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
