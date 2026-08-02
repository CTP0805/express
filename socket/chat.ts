import type { Server } from "socket.io";
import type { ResultSetHeader } from "mysql2";
import pool from "../utils/connect-mysql.js";
const onlineAdmins = new Map<string, string>();
type ChatMessage = {
  roomId: string;
  text: string;
  image_url?: string; // 前端傳進來的名稱
  sender: "user" | "admin";
};

export default function chatSocket(io: Server) {
  io.on("connection", (socket) => {
    socket.on("admin-online", (adminId) => {
      onlineAdmins.set(String(adminId), socket.id);

      console.log("客服上線:", adminId, socket.id);

      io.emit("admin-status", {
        adminId,
        online: true,
      });
    });
    socket.on("disconnect", () => {
      for (const [adminId, socketId] of onlineAdmins.entries()) {
        if (socketId === socket.id) {
          onlineAdmins.delete(adminId);

          io.emit("admin-status", {
            adminId,
            online: false,
          });

          console.log("客服離線:", adminId);
        }
      }
    });
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
    });
    socket.on("admin-typing", ({ roomId }) => {
      console.log("admin typing:", roomId);

      const room = io.sockets.adapter.rooms.get(roomId);

      console.log("房間成員:", room);

      socket.to(roomId).emit("admin-typing");
    });
    socket.on("user-typing", ({ roomId }) => {
      socket.to(roomId).emit("user-typing");
    });
    socket.on("send-message", async (data: ChatMessage) => {
      try {
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

        // 2. 插入訊息（資料庫欄位是 image）
        const [result] = await pool.query<ResultSetHeader>(
          `INSERT INTO chat_messages(room_id, sender, text, image) 
           VALUES(?, ?, ?, ?)`,
          [
            roomId,
            data.sender,
            data.text || "",
            data.image_url || null, // 前端傳 image_url → 存進 image
          ],
        );

        // 3. 查出剛插入的完整資料
        const [rows]: any = await pool.query(
          `SELECT 
             id, 
             room_id, 
             sender, 
             text, 
             image,          -- 資料庫欄位
             is_read, 
             created_at 
           FROM chat_messages 
           WHERE id = ?`,
          [result.insertId],
        );

        const row = rows[0];

        // 轉換成前端習慣的格式
        const fullMessage = {
          id: row.id,
          roomId: data.roomId,
          sender: row.sender,
          text: row.text,
          image_url: row.image, // 資料庫 image → 前端 image_url
          is_read: row.is_read,
          created_at: row.created_at,
        };

        // 4. 廣播給房間其他人
        socket.to(data.roomId).emit("receive-message", fullMessage);
      } catch (err) {
        console.error("send-message 錯誤:", err);
      }
    });

    // 客服標記已讀
    socket.on("mark-as-read", async (data: { userId: number }) => {
      const roomId = `user-${data.userId}`;

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

      io.to(roomId).emit("messages-read", {
        roomId,
      });
    });
  });
}
