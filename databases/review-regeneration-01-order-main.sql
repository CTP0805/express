-- ========================================================
-- 體驗評論重建 01/03：產生訂單主表
-- 匯入順序：本檔 -> 02-order-items -> 03-experience-reviews
-- 日期範圍：2026-01-01 至 2026-07-20
-- ========================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 一般會員（1~60）的已付款訂單。
-- 每個商品需要 10~15 則評論；商品 1、5 各預留一則給會員 101。
INSERT INTO `order_main` (
  `id`,
  `member_id`,
  `contact_name`,
  `contact_phone`,
  `contact_email`,
  `payment_method`,
  `order_status`,
  `original_amount`,
  `coupon_id`,
  `coupon_discount`,
  `points_redeemed`,
  `final_amount`,
  `points_earned`,
  `created_at`,
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
),
generated_orders AS (
  SELECT
    e.`id` AS `experience_id`,
    rs.n,
    1 + MOD(e.`id` * 37 + rs.n * 17, 60) AS `member_id`,
    1 + MOD(e.`id` + rs.n, 3) AS `quantity`,
    DATE_ADD(
      '2026-01-01 09:00:00',
      INTERVAL MOD(e.`id` * 17 + rs.n * 11, 200) DAY
    ) AS `ordered_at`,
    s.`adult_price`
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
)
SELECT
  CONCAT('AW26-R-', LPAD(go.`experience_id`, 3, '0'), '-', LPAD(go.n, 2, '0')),
  go.`member_id`,
  m.`name`,
  COALESCE(m.`phone`, CONCAT('09', LPAD(go.`member_id`, 8, '0'))),
  m.`email`,
  CASE MOD(go.`experience_id` + go.n, 3)
    WHEN 0 THEN 'credit_card'
    WHEN 1 THEN 'line_pay'
    ELSE 'ecpay'
  END,
  'paid',
  go.`adult_price` * go.`quantity`,
  NULL,
  0,
  0,
  go.`adult_price` * go.`quantity`,
  FLOOR(go.`adult_price` * go.`quantity` / 100),
  go.`ordered_at`,
  go.`ordered_at`
FROM generated_orders AS go
INNER JOIN `member` AS m
  ON m.`id` = go.`member_id`
ON DUPLICATE KEY UPDATE
  `member_id` = VALUES(`member_id`),
  `contact_name` = VALUES(`contact_name`),
  `contact_phone` = VALUES(`contact_phone`),
  `contact_email` = VALUES(`contact_email`),
  `payment_method` = VALUES(`payment_method`),
  `order_status` = VALUES(`order_status`),
  `original_amount` = VALUES(`original_amount`),
  `coupon_id` = VALUES(`coupon_id`),
  `coupon_discount` = VALUES(`coupon_discount`),
  `points_redeemed` = VALUES(`points_redeemed`),
  `final_amount` = VALUES(`final_amount`),
  `points_earned` = VALUES(`points_earned`),
  `created_at` = VALUES(`created_at`),
  `updated_at` = VALUES(`updated_at`);

-- 會員 101 的五種流程情境：
-- 1. 已付款且已評論
-- 2. 已付款但尚未評論
-- 3. 待付款
-- 4. 已取消
-- 5. 已付款多商品，其中一項評論、另一項未評論
INSERT INTO `order_main` (
  `id`,
  `member_id`,
  `contact_name`,
  `contact_phone`,
  `contact_email`,
  `payment_method`,
  `order_status`,
  `original_amount`,
  `coupon_id`,
  `coupon_discount`,
  `points_redeemed`,
  `final_amount`,
  `points_earned`,
  `created_at`,
  `updated_at`
)
SELECT
  scenario.`id`,
  101,
  m.`name`,
  COALESCE(m.`phone`, '0910101101'),
  m.`email`,
  scenario.`payment_method`,
  scenario.`order_status`,
  scenario.`original_amount`,
  NULL,
  0,
  0,
  scenario.`final_amount`,
  scenario.`points_earned`,
  scenario.`created_at`,
  scenario.`created_at`
FROM `member` AS m
INNER JOIN (
  SELECT 'AW26-101-01' AS `id`, 'credit_card' AS `payment_method`, 'paid' AS `order_status`,
         1800.00 AS `original_amount`, 1800.00 AS `final_amount`, 18 AS `points_earned`,
         '2026-02-10 10:15:00' AS `created_at`
  UNION ALL
  SELECT 'AW26-101-02', 'line_pay', 'paid', 2200.00, 2200.00, 22, '2026-03-18 14:30:00'
  UNION ALL
  SELECT 'AW26-101-03', 'ecpay', 'pending', 1500.00, 1500.00, 0, '2026-05-06 09:20:00'
  UNION ALL
  SELECT 'AW26-101-04', 'credit_card', 'cancelled', 2600.00, 2600.00, 0, '2026-06-12 16:40:00'
  UNION ALL
  SELECT 'AW26-101-05', 'line_pay', 'paid', 4200.00, 4200.00, 42, '2026-07-18 11:05:00'
) AS scenario
  ON m.`id` = 101
ON DUPLICATE KEY UPDATE
  `member_id` = VALUES(`member_id`),
  `contact_name` = VALUES(`contact_name`),
  `contact_phone` = VALUES(`contact_phone`),
  `contact_email` = VALUES(`contact_email`),
  `payment_method` = VALUES(`payment_method`),
  `order_status` = VALUES(`order_status`),
  `original_amount` = VALUES(`original_amount`),
  `coupon_id` = VALUES(`coupon_id`),
  `coupon_discount` = VALUES(`coupon_discount`),
  `points_redeemed` = VALUES(`points_redeemed`),
  `final_amount` = VALUES(`final_amount`),
  `points_earned` = VALUES(`points_earned`),
  `created_at` = VALUES(`created_at`),
  `updated_at` = VALUES(`updated_at`);

COMMIT;

-- 驗證：不應出現會員 102、103，日期不可超過 2026-07-29。
SELECT
  COUNT(*) AS `generated_order_count`,
  MIN(`created_at`) AS `earliest_order`,
  MAX(`created_at`) AS `latest_order`,
  SUM(`member_id` IN (102, 103)) AS `excluded_member_order_count`
FROM `order_main`
WHERE `id` LIKE 'AW26-%';
