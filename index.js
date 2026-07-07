import express from 'express';
import ecpayRouter from './routes/ecpay-test-only.js'; // 💡 引入你的綠界路由

const app = express();
const PORT = 3001; // 💡 因為前端 Next.js 已經佔用 3000，後端請改用 3001

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 💡 綁定你的路由
app.use('/ecpay', ecpayRouter); 

app.listen(PORT, () => {
  console.log(`後端伺服器已啟動：http://localhost:${PORT}`);
});