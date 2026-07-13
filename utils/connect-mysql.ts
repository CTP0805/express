import mysql, {
  type Pool,
  type PoolConnection,
  type RowDataPacket,
} from "mysql2/promise";
import "dotenv/config"; // 載入環境變數設定檔內容

type PoolErrorEvent = {
  on(event: "error", listener: (err: NodeJS.ErrnoException) => void): void;
};

// node.js 與 資料庫的連線
const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT } = process.env;

console.log({ DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT });

const pool: Pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  port: Number(DB_PORT) || 3306,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 5, // 在開發時不會設太大的數字 因為資料庫連線很耗電腦效能
  queueLimit: 0,
});

// 連線池事件監聽 「.on 」 = 「.addEventListener 」
pool.on("connection", (connection: PoolConnection) => {
  console.log(`新的資料庫連線建⽴ ID: ${connection.threadId}`);
});


(pool as unknown as PoolErrorEvent).on("error", (err) => {
  console.error("❌ 資料庫連線池錯誤:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("資料庫連線中斷，嘗試重新連線...");
  } else if (err.code === "ER_CON_COUNT_ERROR") {
    console.log("資料庫連線數過多");
  } else if (err.code === "ECONNREFUSED") {
    console.log("資料庫連線被拒絕");
  }
});

try {
  const connection: PoolConnection = await pool.getConnection();
  console.log("🎯 資料庫連線測試成功");
  // 檢查資料庫版本
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT VERSION() as version",
  );
  console.log(`MySQL 版本: ${rows[0].version}`);
  connection.release(); // 釋放連線
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("資料庫連線失敗:", error.message);
  } else {
    console.error("資料庫連線失敗:", error);
  }
}
export default pool;
