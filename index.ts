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
import apiMemberOrdersRouter from "./routes/api-member-orders.js";
import cartRouter from "./routes/api-cart.js"
import checkoutRouter from "./routes/api-checkout.js"
import ecpayRouter from "./routes/ecpay-test-only.js"; 
import linepayRouter from "./routes/linepay.js";
import experienceRouter from "./routes/experience.js";
import apiMemberCouponRouter from "./routes/api-member-coupon.js";
import apiMemberLevelRouter from "./routes/api-member-level.js";
import apiMemberOrderRouter from "./routes/api-member-order.js";
import apiBlogRouter from "./routes/api-blog.js";
import apiBlogUploadRouter from "./routes/api-blog-upload.js";
import apiChatRouter from "./routes/api-chat.js";
import apiLocationRouter from "./routes/api-location.js"
import chatSocket from "./socket/chat.js";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import { Server } from "socket.io";


const app = express();
const server = createServer(app);
//socket cos要另外設定
const io = new Server(server, {
  cors: {
    origin: function (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      // 開發階段暫時允許所有前端來源連線
      // 正式部署時需改成白名單限制，避免未授權網站連接 Socket
      callback(null, true);
    },
    credentials: true,
  },
});
chatSocket(io);

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
// --- 本人：coupon / level / success 後續 / blog ---
app.use("/api/member-coupon", apiMemberCouponRouter); // M幣查詢、領券
app.use("/api/member-level", apiMemberLevelRouter); // 等級讀取
app.use("/api/member-order", apiMemberOrderRouter);
app.use("/api/blog/upload", apiBlogUploadRouter); // 封面上傳（須在 /api/blog 前）
app.use("/api/blog", apiBlogRouter); // 文章 CRUD
app.use("/ecpay", ecpayRouter);
app.use("/linepay", linepayRouter);
app.use("/api/experiences", experienceRouter); 
app.use('/api/cart', cartRouter); 
app.use('/api/checkout', checkoutRouter); 
app.use('/api/member-orders', apiMemberOrdersRouter); 
app.use("/api/chat", apiChatRouter);
app.use("/api/location",apiLocationRouter)
const port = Number(process.env.PORT) || 3001;
//socket跟伺服器共用一個port
server.listen(port, () => {
  console.log(`Express + TS 啟動 http://localhost:${port}`);
});
