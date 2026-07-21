-- 阿偉：部落格擴充欄位（獨立檔，可重複執行前請先檢查欄位是否已存在）
-- 你目前 DB 已有 review_note；order_id／order_title 可選加

-- 退回原因（若尚未建立）
-- ALTER TABLE `posts`
--   ADD COLUMN `review_note` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '管理者審查／退回原因' AFTER `category_id`;

-- 訂單綁定（撰寫文章用，可選）
-- ALTER TABLE `posts`
--   ADD COLUMN `order_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '綁定 order_main.id' AFTER `category_id`,
--   ADD COLUMN `order_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '訂單／體驗名稱' AFTER `order_id`;
-- ALTER TABLE `posts` ADD UNIQUE KEY `uk_posts_order_id` (`order_id`);
