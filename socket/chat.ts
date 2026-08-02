import type { Server } from "socket.io";
import type { ResultSetHeader } from "mysql2";
import pool from "../utils/connect-mysql.js";

type ChatRoom = {
  id: number;
};

type ChatMessage = {
  roomId: string;
  text: string;
  sender: "user" | "admin";
};

export default function chatSocket(io: Server) {
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("send-message", async (data: ChatMessage) => {
      const userId = data.roomId.split("-")[1];

      // 1. 找或建立房間
      const [rooms]: any = await pool.query(
        `SELECT id FROM chat_rooms WHERE user_id = ?`,
        [userId],
      );

      let roomId: number;

      if (rooms.length > 0) {
        roomId = rooms[0].id;
      } else {
        const [result] = await pool.query<ResultSetHeader>(
          `INSERT INTO chat_rooms(user_id) VALUES(?)`,
          [userId],
        );
        roomId = result.insertId;
      }

      // 2. 插入訊息
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO chat_messages(room_id, sender, text) VALUES(?,?,?)`,
        [roomId, data.sender, data.text],
      );

      // 3. 查出剛插入的完整資料（含 created_at）
      const [rows]: any = await pool.query(
        `SELECT id, room_id, sender, text, is_read, created_at 
     FROM chat_messages 
     WHERE id = ?`,
        [result.insertId],
      );

      const fullMessage = {
        ...rows[0],
        roomId: data.roomId, // 保持前端用的 roomId 格式
      };

      // 4. 只廣播給其他人（不要給自己）
      socket.to(data.roomId).emit("receive-message", fullMessage);
    });
    // 客服標記已讀
    socket.on("mark-as-read", async (data: { userId: number }) => {
      const roomId = `user-${data.userId}`;

      // 把該使用者房間裡，sender = 'user' 且尚未已讀的訊息全部改成已讀
      await pool.query(
        `UPDATE chat_messages 
     SET is_read = 1 
     WHERE room_id = (
       SELECT id FROM chat_rooms WHERE user_id = ?
     ) 
     AND sender = 'user' 
     AND is_read = 0`,
        [data.userId],
      );

      // 即時通知使用者端
      io.to(roomId).emit("messages-read", {
        roomId,
      });
    });
  });
}
