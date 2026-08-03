// 這個檔案是在寫一個上傳檔案的模組
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { v4 } from "uuid"; // uuid 是獨一無二的亂碼

// 1.篩選檔案、 2.決定副檔名
const extMap: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

// 這段程式碼先列出一個清單（extMap），只准 PNG、JPG、WebP 進來。
// key是我要的，value是決定要存成的副檔名(因為後面要改檔名，新名字是由檔名和副檔名組成的)

function fileFilter(
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  console.log("收到檔案:", file);
  console.log("mimetype:", file.mimetype);

  // 篩選是否符合這三種檔案類型
  callback(null, !!extMap[file.mimetype]);
}

const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, destination: string) => void,
  ): void => {
    callback(null, "public/chat"); // null 表⽰沒有錯誤
  },
  // 搬運工收到照片後，會直接把它搬到你的專案裡一個叫 public/images 的資料夾
  // 因為放在 public 資料夾的東西，客人的瀏覽器才看得到
  /* 
  第一個位置 (null)：代表「錯誤資訊」。
  寫 null 就表示：「報告長官，過程很順利，完全沒有發生程式錯誤！」
  如果你寫了東西（例如 new Error('壞掉了')），Multer 就會立刻停下所有動作去報錯。

  第二個位置 (!!...)：代表「結果」。
  也就是你最終要告訴 Multer 的答案：這張票（檔案）到底給不給過？
  */
  filename: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, filename: string) => void,
  ): void => {
    const f = v4() + extMap[file.mimetype];
    callback(null, f);
  },
  // 改名字，改成 uuid 這種獨一無二的亂碼
  // 新名字 = uuid + 副檔名
});

// 2 * 1024 * 1024 = 2MB。
// 因需求是「小於」2MB，因此減 1，讓剛好 2MB 的檔案也會被拒絕。
const MAX_FILE_SIZE = 2 * 1024 * 1024 - 1;

export default multer({
  storage, // 決定檔案要存在哪裡、檔名怎麼產生
  fileFilter, // 只允許 PNG、JPG、WEBP
  limits: {
    fileSize: MAX_FILE_SIZE, // 每一個上傳檔案必須小於 2MB
  },
}); // 匿名匯出，匯入時可以改名字
