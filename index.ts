import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import "dotenv/config";
import cors, { type CorsOptions } from "cors";
import jwt, { type JwtPayload } from "jsonwebtoken";
import apiAuthRouter from "./routes/api-auth.js";
import apiMemberRouter from "./routes/api-member.js";
import ecpayRouter from "./routes/ecpay-test-only.js"; // 💡 引入你的綠界路由
import linepayRouter from "./routes/linepay.js";
import cookieParser from "cookie-parser";

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
app.use(cookieParser());

// 自訂 middleware (驗證JWT token_version)
/*
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const bearer = req.get("Authorization") || "";

  if (bearer.startsWith("Bearer ")) {
    const token = bearer.slice(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "JWT_KEY");

      // 確認 JWT 解碼後確實是物件
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "id" in decoded &&
        "token_version" in decoded
      ) {
        const jwtPayload = decoded as {
          id: number;
          token_version: number;
        };

        // 查詢資料庫目前最新的 token_version
        const [members] = await pool.query<{ token_version: number }[]>(
          `
            SELECT token_version
            FROM member
            WHERE id = ?
          `,
          [jwtPayload.id],
        );

        const currentMember = members[0];

        // JWT 版本和資料庫版本相同才算登入有效
        if (
          currentMember &&
          currentMember.token_version === jwtPayload.token_version
        ) {
          res.locals.user = decoded;
        }
      }
    } catch (error) {
      // JWT 過期或驗證失敗時，不設定 res.locals.user
      console.warn("JWT 驗證失敗");
    }
  }

  next();
});
*/

app.use("/api/auth", apiAuthRouter);
app.use("/api/member", apiMemberRouter);
app.use("/ecpay", ecpayRouter);
app.use("/linepay", linepayRouter);

const port = Number(process.env.PORT) || 3001;

app.listen(port, () => {
  console.log(`Express + TS 啟動 http://localhost:${port}`);
});
