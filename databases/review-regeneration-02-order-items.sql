-- ========================================================
-- 體驗評論重建 02/03：產生訂單明細
-- 需先匯入：review-regeneration-01-order-main.sql
-- ========================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 一般會員的訂單明細；每筆明細只對應一個商品與一則評論。
INSERT INTO `order_items` (
  `id`,
  `order_id`,
  `experience_id`,
  `session_id`,
  `original_unit_price`,
  `quantity`,
  `subtotal`,
  `item_status`,
  `special_request`,
  `updated_at`
)
WITH RECURSIVE review_seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1
  FROM review_seq
  WHERE n < 15
),
first_session AS (
  SELECT `experience_id`, MIN(`id`) AS `session_id`
  FROM `sessions`
  GROUP BY `experience_id`
)
SELECT
  260000 + e.`id` * 100 + rs.n,
  CONCAT('AW26-R-', LPAD(e.`id`, 3, '0'), '-', LPAD(rs.n, 2, '0')),
  e.`id`,
  s.`id`,
  s.`adult_price`,
  1 + MOD(e.`id` + rs.n, 3),
  s.`adult_price` * (1 + MOD(e.`id` + rs.n, 3)),
  'confirmed',
  CASE MOD(e.`id` + rs.n, 5)
    WHEN 0 THEN '希望安排步調較輕鬆，謝謝。'
    WHEN 1 THEN '第一次參加，請協助留意集合位置。'
    ELSE NULL
  END,
  DATE_ADD(
    '2026-01-01 09:00:00',
    INTERVAL MOD(e.`id` * 17 + rs.n * 11, 200) DAY
  )
FROM `experiences` AS e
INNER JOIN first_session AS fs
  ON fs.`experience_id` = e.`id`
INNER JOIN `sessions` AS s
  ON s.`id` = fs.`session_id`
INNER JOIN review_seq AS rs
  ON rs.n <= (
    10 + MOD(e.`id` * 7, 6)
    - CASE WHEN e.`id` IN (1, 5) THEN 1 ELSE 0 END
  )
ON DUPLICATE KEY UPDATE
  `order_id` = VALUES(`order_id`),
  `experience_id` = VALUES(`experience_id`),
  `session_id` = VALUES(`session_id`),
  `original_unit_price` = VALUES(`original_unit_price`),
  `quantity` = VALUES(`quantity`),
  `subtotal` = VALUES(`subtotal`),
  `item_status` = VALUES(`item_status`),
  `special_request` = VALUES(`special_request`),
  `updated_at` = VALUES(`updated_at`);

-- 會員 101：五張訂單共六筆商品明細。
INSERT INTO `order_items` (
  `id`,
  `order_id`,
  `experience_id`,
  `session_id`,
  `original_unit_price`,
  `quantity`,
  `subtotal`,
  `item_status`,
  `special_request`,
  `updated_at`
)
WITH first_session AS (
  SELECT `experience_id`, MIN(`id`) AS `session_id`
  FROM `sessions`
  GROUP BY `experience_id`
),
scenario_items AS (
  SELECT 299001 AS `id`, 'AW26-101-01' AS `order_id`, 1 AS `experience_id`,
         1 AS `quantity`, 'confirmed' AS `item_status`, '已完成，後續建立評論。' AS `special_request`,
         '2026-02-10 10:15:00' AS `updated_at`
  UNION ALL
  SELECT 299002, 'AW26-101-02', 2, 1, 'confirmed', '已完成，但刻意保留未評論狀態。', '2026-03-18 14:30:00'
  UNION ALL
  SELECT 299003, 'AW26-101-03', 3, 1, 'pending', '待付款流程測試。', '2026-05-06 09:20:00'
  UNION ALL
  SELECT 299004, 'AW26-101-04', 4, 1, 'cancelled', '取消訂單流程測試。', '2026-06-12 16:40:00'
  UNION ALL
  SELECT 299005, 'AW26-101-05', 5, 1, 'confirmed', '同張訂單第一項，已評論。', '2026-07-18 11:05:00'
  UNION ALL
  SELECT 299006, 'AW26-101-05', 6, 1, 'confirmed', '同張訂單第二項，刻意未評論。', '2026-07-18 11:05:00'
)
SELECT
  si.`id`,
  si.`order_id`,
  si.`experience_id`,
  s.`id`,
  s.`adult_price`,
  si.`quantity`,
  s.`adult_price` * si.`quantity`,
  si.`item_status`,
  si.`special_request`,
  si.`updated_at`
FROM scenario_items AS si
INNER JOIN first_session AS fs
  ON fs.`experience_id` = si.`experience_id`
INNER JOIN `sessions` AS s
  ON s.`id` = fs.`session_id`
ON DUPLICATE KEY UPDATE
  `order_id` = VALUES(`order_id`),
  `experience_id` = VALUES(`experience_id`),
  `session_id` = VALUES(`session_id`),
  `original_unit_price` = VALUES(`original_unit_price`),
  `quantity` = VALUES(`quantity`),
  `subtotal` = VALUES(`subtotal`),
  `item_status` = VALUES(`item_status`),
  `special_request` = VALUES(`special_request`),
  `updated_at` = VALUES(`updated_at`);

COMMIT;

SELECT
  COUNT(*) AS `generated_item_count`,
  SUM(`item_status` = 'confirmed') AS `confirmed_count`,
  SUM(`item_status` = 'pending') AS `pending_count`,
  SUM(`item_status` = 'cancelled') AS `cancelled_count`
FROM `order_items`
WHERE `order_id` LIKE 'AW26-%';
