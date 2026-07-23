import { type Request, type Response, Router } from "express";
import pool from "../utils/connect-mysql.js"

const router: Router = Router();

router.get("/:userId/messages", async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const [rows] = await pool.query(
            `
            SELECT cm.sender,cm.text,cm.created_at FROM chat_messages cm JOIN chat_rooms cr ON cm.room_id=cr.id WHERE cr.user_id=? ORDER BY cm.created_at ASC`
            , [userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "取得聊天記錄失敗"
        })
    }
})
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
      `
        );


        res.json(rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "取得客服列表失敗"
        });

    }
});
export default router