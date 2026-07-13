import  { Router } from "express";


const router: Router = Router();
import * as crypto from 'crypto'
import { createLinePayClient } from 'line-pay-merchant'

// 💡 為了不依賴你的 server.config.js，我們直接把金流必填的測試資料寫死在這裡
// 這些都是 LINE Pay 官方公開的測試環境沙盒帳號（Sandbox）
const linePayClient = createLinePayClient({
  channelId: '2010669119', // 官方測試 channelId
  channelSecretKey: 'f0fe0d34fef5d45aa4a09823bf3d136a', // 官方測試 secretKey
  env: 'development', // LINE Pay Sandbox
})

// 使用者用手機付完款後，LINE Pay 會把使用者帶回你的前端哪個畫面？
// 這裡設定付完款後導回你前端的 localhost:3000/completed 頁面
const redirectUrls = {
  confirmUrl: 'http://localhost:3000/success', 
  cancelUrl: 'http://localhost:3000/payment',
}

// 關卡一：前端按下確認付款，來這裡「預約訂單」
router.get('/reserve', async (req, res) => {
  const amount = typeof req.query.amount === 'string' ? Number(req.query.amount) || 0 : 0
  const items = typeof req.query.items === 'string' ? req.query.items : '商品一批'

  if (!amount) {
    return res.status(400).json({ success: false, message: '缺少總金額' })
  }

  // 組裝 LINE Pay 官方規定的訂單格式
  const order = {
    orderId: `line_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, // 隨機產生不重複訂單號
    currency: 'TWD',
    amount: amount,
    packages: [
      {
        id: crypto.randomBytes(5).toString('hex'),
        amount: amount,
        name: '線上商店購物',
        products: [
          {
            id: crypto.randomBytes(5).toString('hex'),
            name: items, // 帶入你前端傳來的「濟州島9.81 Park門票」
            quantity: 1,
            price: amount,
          },
        ],
      },
    ],
    options: { display: { locale: 'zh_TW' } },
    redirectUrls,
  }

  try {
    // 呼叫套件發送請求給 LINE Pay
    const linePayResponse = await linePayClient.request.send({
      body: order,
    })

    if (linePayResponse.body.returnCode === '0000') {
      // 🟢 成功要到網址了！直接回傳 JSON 給前端
      return res.json({
        success: true,
        paymentUrl: linePayResponse.body.info.paymentUrl.web, // 付款網址
      })
    } else {
      return res.status(400).json({
        success: false,
        message: linePayResponse.body.returnMessage,
      })
    }
  } catch (error) {
    console.error('LINE Pay Reserve 錯誤:', error)
    return res.status(500).json({ success: false, message: 'LINE Pay 伺服器連線失敗' })
  }
})

export default router
