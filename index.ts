import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import "dotenv/config";
import cors, { type CorsOptions } from "cors";
import apiAuthRouter from "./routes/api-auth"
import apiMemberRouter from "./routes/api-member"


const app = express();

// 每次有 request，都把他的來源丟到這，然後由我決定要不要放行
const corsOptions: CorsOptions = {
  credentials: true, // 允許瀏覽器攜帶：cookie、session、authorization headers
  // 並會回傳 Access-Control-Allow-Credentials: true
  origin: function (
    origin: string | undefined, // 用戶端送過來的 origin 檔頭
    callback: (error: Error | null, allow?: boolean) => void,
  ) {
    // console.log({ origin });
    callback(null, true); // 所有的網站都允許 // 錯誤先行的寫法
  },
};


// Adds headers: Access-Control-Allow-Origin: *
app.use(cors(corsOptions));
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// 自訂 middleware
app.use((req: Request, res: Response, next: NextFunction) => {  
  // 處理 JWT ***************
  const bearer = req.get("Authorization") || ""; // 取得 header
  if (bearer.length > 7) { // b-e-a-r-e-r-_- 總共7個字元 要確保 token 格式正確(開頭有 bearer)
    const token = bearer.slice(7); // 刪掉 bearer，留下真正的 token
    try {
      res.locals.user = jwt.verify(token, process.env.JWT_SECRET || "JWT_KEY");
    } catch (error) {}
  }
  /* 更好的寫法 by ChatGPT
  const authHeader = req.get("Authorization");

  if (!authHeader) return;

  const [type, token] = authHeader.split(" "); // 用空格把字串切開

  if (type !== "Bearer" || !token) return;

  try {
    res.locals.user = jwt.verify(token, process.env.JWT_SECRET || "JWT_KEY");
  } catch (err) {
    // token 錯誤
  }
  */
  next(); // 往下走, 比對以下的路由
});


app.use("/api/auth", apiAuthRouter);
app.use("/api/member", apiMemberRouter);

const port = Number(process.env.PORT) || 3002;

app.listen(port, () => {
  console.log(`Express + TS 啟動 http://localhost:${port}`);
});
