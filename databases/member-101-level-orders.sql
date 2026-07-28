-- =============================================================================
-- 測試會員 101：會員等級頁用訂單假資料
-- =============================================================================
-- 對應會員：
--   member.id = 101
--   member.name = 一般會員(測試)
--
-- 執行結果：
--   已付款訂單數 = 2
--   累積實付金額 = NT$2,800
--   會員等級 = 啟程旅人
--
-- 注意：
--   此檔是會員 101 的「重建腳本」，會先刪除該測試會員原有的訂單明細與訂單，
--   再建立固定的兩筆資料。請勿套用到正式會員帳號。
-- =============================================================================

START TRANSACTION;

-- 先刪除明細，再刪除主訂單，避免 order_items 外鍵阻擋。
DELETE oi
FROM order_items AS oi
INNER JOIN order_main AS om ON om.id = oi.order_id
WHERE om.member_id = 101;

DELETE FROM order_main
WHERE member_id = 101;

-- 兩筆訂單的 final_amount：1,200 + 1,600 = 2,800。
INSERT INTO order_main (
  id,
  member_id,
  contact_name,
  contact_phone,
  contact_email,
  payment_method,
  order_status,
  original_amount,
  coupon_id,
  coupon_discount,
  points_redeemed,
  final_amount,
  points_earned,
  created_at,
  updated_at
) VALUES
(
  'EU101LV0001',
  101,
  '一般會員(測試)',
  '0900000101',
  'member@example.com',
  'credit_card',
  'paid',
  1200.00,
  NULL,
  0.00,
  0,
  1200.00,
  12,
  '2026-07-12 10:00:00',
  '2026-07-12 10:00:00'
),
(
  'EU101LV0002',
  101,
  '一般會員(測試)',
  '0900000101',
  'member@example.com',
  'line_pay',
  'paid',
  1600.00,
  NULL,
  0.00,
  0,
  1600.00,
  16,
  '2026-07-22 14:30:00',
  '2026-07-22 14:30:00'
);

-- 每筆訂單各放一筆已確認的體驗明細。
-- experience_id / session_id 使用 seed.sql 已建立的測試外鍵。
INSERT INTO order_items (
  order_id,
  experience_id,
  session_id,
  original_unit_price,
  quantity,
  subtotal,
  item_status,
  special_request,
  updated_at
) VALUES
(
  'EU101LV0001',
  1,
  1,
  1200.00,
  1,
  1200.00,
  'confirmed',
  '測試會員 101 的第一筆會員等級訂單。',
  '2026-07-12 10:00:00'
),
(
  'EU101LV0002',
  2,
  2,
  800.00,
  2,
  1600.00,
  'confirmed',
  '測試會員 101 的第二筆會員等級訂單。',
  '2026-07-22 14:30:00'
);

-- Level API 直接 SELECT member 表，因此同步會員累積欄位。
UPDATE member
SET
  member_level = '啟程旅人',
  total_spent = 2800,
  total_orders = 2
WHERE id = 101;

COMMIT;

-- 執行後驗證：應得到 paid_order_count=2、paid_total_spent=2800。
SELECT
  COUNT(*) AS paid_order_count,
  COALESCE(SUM(final_amount), 0) AS paid_total_spent
FROM order_main
WHERE member_id = 101
  AND order_status = 'paid';

-- 應得到 member_level=啟程旅人、total_spent=2800、total_orders=2。
SELECT
  id,
  name,
  member_level,
  total_spent,
  total_orders,
  current_points
FROM member
WHERE id = 101;
