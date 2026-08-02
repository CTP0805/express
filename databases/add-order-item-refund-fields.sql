-- 讓單一訂單項目的 M 幣退款可以由 order_items 永久推導。
-- 已有資料庫請執行此檔；全新建庫直接使用 schema.sql 即可。
ALTER TABLE `order_items`
  ADD COLUMN `refunded_points` INT NOT NULL DEFAULT 0 AFTER `item_status`,
  ADD COLUMN `cancelled_at` DATETIME NULL AFTER `refunded_points`;
