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

      await pool.query(
        `INSERT INTO chat_messages(room_id,sender,text) VALUES(?,?,?)`,
        [roomId, data.sender, data.text],
      );

      io.to(data.roomId).emit("receive-message", data);
    });
  });
}
