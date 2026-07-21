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
import cartRouter from "./routes/api-cart.js"
import checkoutRouter from "./routes/api-checkout.js"
import ecpayRouter from "./routes/ecpay-test-only.js"; 
import linepayRouter from "./routes/linepay.js";
import experienceRouter from "./routes/experience.js";
/** blog / M幣券 / 等級：獨立路由檔（僅掛載，不改他人路由內容） */
import apiMemberCouponRouter from "./routes/api-member-coupon.js";
import apiMemberLevelRouter from "./routes/api-member-level.js";
import apiBlogRouter from "./routes/api-blog.js";
import apiBlogUploadRouter from "./routes/api-blog-upload.js";
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

app.use("/api/auth", apiAuthRouter);
app.use("/api/member", apiMemberRouter);
app.use("/api/member-coupon", apiMemberCouponRouter);
app.use("/api/member-level", apiMemberLevelRouter);
app.use("/api/blog/upload", apiBlogUploadRouter);
app.use("/api/blog", apiBlogRouter);
app.use("/ecpay", ecpayRouter);
app.use("/linepay", linepayRouter);
app.use("/api/experiences", experienceRouter); 
app.use('/api/cart', cartRouter); 
app.use('/api/checkout', checkoutRouter); 

const port = Number(process.env.PORT) || 3001;

app.listen(port, () => {
  console.log(`Express + TS 啟動 http://localhost:${port}`);
});
