import { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js";
import type { RowDataPacket } from "mysql2";
import uploadChatImage from "../utils/upload-chat-image.js";
interface Room extends RowDataPacket {
  id: number;
}

const router: Router = Router();

router.get("/:userId/messages", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query(
      `
        SELECT 
          cm.sender,
          cm.text,
          cm.image AS image_url,   -- 資料庫 image 轉成 image_url
          cm.created_at,
          cm.is_read
        FROM chat_messages cm
        JOIN chat_rooms cr ON cm.room_id = cr.id
        WHERE cr.user_id = ?
        ORDER BY cm.created_at ASC
      `,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "取得聊天記錄失敗",
    });
  }
});
router.get("/users", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        cr.id AS room_id,
        cr.user_id,
        m.name
      FROM chat_rooms cr
      JOIN member m
      ON cr.user_id = m.id
      `,
    );

    res.json(rows);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "取得客服列表失敗",
    });
  }
});
router.patch("/:userId/read", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const [rooms] = await pool.query<Room[]>(
      `SELECT id FROM chat_rooms WHERE user_id=?`,
      [userId],
    );

    const room = rooms[0];

    if (!room) {
      return res.status(404).json({
        message: "找不到聊天室",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE chat_messages
      SET is_read = 1
      WHERE room_id = ?
      AND sender = 'user'
      `,
      [room.id],
    );

    res.json({
      message: "已讀更新成功",
      result,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "已讀更新失敗",
    });
  }
});

router.post(
  "/upload",
  uploadChatImage.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "沒有收到圖片",
        });
      }

      const imageUrl = `/chat/${req.file.filename}`;

      res.json({
        success: true,
        imageUrl,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: "圖片上傳失敗",
      });
    }
  },
);
export default router;
