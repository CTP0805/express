import express, { type Request, type Response, Router } from "express";


const router: Router = Router();

// 取得會員資料
router.get("/profile", (req: Request, res: Response) => {
  
});

// 修改會員資料
router.put("/profile", (req: Request, res: Response) => {
  
});

// 會員大頭貼上傳
router.post("/avatar", (req: Request, res: Response) => {
  
});

// 會員大頭貼更新
router.put("/avatar", (req: Request, res: Response) => {
  
});

// 取得最近瀏覽資料
router.get("/recently-viewed", (req: Request, res: Response) => {
  
});

// 加入最近瀏覽
router.post("/recently-viewed", (req: Request, res: Response) => {
  
});

// 刪除最近瀏覽
router.delete("/recently-viewed", (req: Request, res: Response) => {
  
});

export default router;
