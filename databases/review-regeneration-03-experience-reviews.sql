-- ========================================================
-- 體驗評論重建 03/03：重建所有商品評論
-- 需先匯入：01-order-main、02-order-items
--
-- 規則：
-- 1. 每個商品 10~15 則評論。
-- 2. 每個商品先取得不同的 1~5 分目標分數帶，
--    單筆評分再於目標附近浮動，讓各商品平均分數有所差異。
-- 3. 評論內容依評分呈現負面、中立或正面語氣。
-- 4. 評論在訂單出發日後 1~4 天內，且不超過 2026-07-29。
-- 5. 一般評論者只使用會員 1~60；排除 102、103。
-- 6. 會員 101 另有兩則已評論情境，其餘情境刻意未評論。
-- 7. 本檔會為 AW26 模擬訂單建立獨立歷史場次，不覆蓋既有場次。
-- ========================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 為一般 AW26 模擬訂單建立獨立歷史場次。
-- 出發日在下單後 1~3 天，評論會再於出發後 1~4 天建立。
INSERT INTO `sessions` (
  `id`,
  `experience_id`,
  `start_time`,
  `end_time`,
  `booking_deadline`,
  `adult_price`,
  `child_price`,
  `min_participants`,
  `max_participants`,
  `status`,
  `created_at`
)
WITH generated_items AS (
  SELECT
    oi.`id` AS `order_item_id`,
    oi.`experience_id`,
    om.`created_at` AS `ordered_at`,
    source_session.`adult_price`,
    source_session.`child_price`,
    source_session.`min_participants`,
    source_session.`max_participants`,
    DATE_ADD(
      om.`created_at`,
      INTERVAL 1 + MOD(oi.`experience_id` * 5 + oi.`id`, 3) DAY
    ) AS `departure_at`
  FROM `order_items` AS oi
  INNER JOIN `order_main` AS om
    ON om.`id` = oi.`order_id`
  INNER JOIN `sessions` AS source_session
    ON source_session.`id` = oi.`session_id`
  WHERE oi.`order_id` LIKE 'AW26-R-%'
)
SELECT
  560000 + gi.`experience_id` * 100 + MOD(gi.`order_item_id`, 100),
  gi.`experience_id`,
  gi.`departure_at`,
  DATE_ADD(gi.`departure_at`, INTERVAL 3 HOUR),
  DATE_SUB(gi.`departure_at`, INTERVAL 24 HOUR),
  gi.`adult_price`,
  gi.`child_price`,
  gi.`min_participants`,
  gi.`max_participants`,
  1,
  gi.`ordered_at`
FROM generated_items AS gi
ON DUPLICATE KEY UPDATE
  `experience_id` = VALUES(`experience_id`),
  `start_time` = VALUES(`start_time`),
  `end_time` = VALUES(`end_time`),
  `booking_deadline` = VALUES(`booking_deadline`),
  `adult_price` = VALUES(`adult_price`),
  `child_price` = VALUES(`child_price`),
  `min_participants` = VALUES(`min_participants`),
  `max_participants` = VALUES(`max_participants`),
  `status` = VALUES(`status`),
  `created_at` = VALUES(`created_at`);

-- 會員 101 的六筆訂單明細也使用獨立歷史場次。
INSERT INTO `sessions` (
  `id`,
  `experience_id`,
  `start_time`,
  `end_time`,
  `booking_deadline`,
  `adult_price`,
  `child_price`,
  `min_participants`,
  `max_participants`,
  `status`,
  `created_at`
)
SELECT
  599000 + MOD(oi.`id`, 1000),
  oi.`experience_id`,
  scenario.`departure_at`,
  DATE_ADD(scenario.`departure_at`, INTERVAL 3 HOUR),
  DATE_SUB(scenario.`departure_at`, INTERVAL 24 HOUR),
  source_session.`adult_price`,
  source_session.`child_price`,
  source_session.`min_participants`,
  source_session.`max_participants`,
  1,
  om.`created_at`
FROM `order_items` AS oi
INNER JOIN `order_main` AS om
  ON om.`id` = oi.`order_id`
INNER JOIN `sessions` AS source_session
  ON source_session.`id` = oi.`session_id`
INNER JOIN (
  SELECT 299001 AS `order_item_id`, '2026-02-12 09:30:00' AS `departure_at`
  UNION ALL SELECT 299002, '2026-03-20 14:00:00'
  UNION ALL SELECT 299003, '2026-05-10 10:00:00'
  UNION ALL SELECT 299004, '2026-06-15 13:30:00'
  UNION ALL SELECT 299005, '2026-07-20 09:30:00'
  UNION ALL SELECT 299006, '2026-07-20 14:00:00'
) AS scenario
  ON scenario.`order_item_id` = oi.`id`
ON DUPLICATE KEY UPDATE
  `experience_id` = VALUES(`experience_id`),
  `start_time` = VALUES(`start_time`),
  `end_time` = VALUES(`end_time`),
  `booking_deadline` = VALUES(`booking_deadline`),
  `adult_price` = VALUES(`adult_price`),
  `child_price` = VALUES(`child_price`),
  `min_participants` = VALUES(`min_participants`),
  `max_participants` = VALUES(`max_participants`),
  `status` = VALUES(`status`),
  `created_at` = VALUES(`created_at`);

-- 只重新綁定本次 AW26 模擬訂單，不影響原有訂單明細。
UPDATE `order_items`
SET `session_id` =
  560000 + `experience_id` * 100 + MOD(`id`, 100)
WHERE `order_id` LIKE 'AW26-R-%';

UPDATE `order_items`
SET `session_id` = 599000 + MOD(`id`, 1000)
WHERE `order_id` LIKE 'AW26-101-%';

-- 本檔的目的就是重新生成評論內容與數量，因此先清除舊評論。
DELETE FROM `experience_reviews`;

INSERT INTO `experience_reviews` (
  `id`,
  `order_item_id`,
  `experience_id`,
  `member_id`,
  `rating`,
  `comment`,
  `created_at`,
  `image_url`
)
WITH RECURSIVE review_seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1
  FROM review_seq
  WHERE n < 15
),
generated_reviews AS (
  SELECT
    e.`id` AS `experience_id`,
    e.`title`,
    rs.n,
    1 + MOD(e.`id` * 37 + rs.n * 17, 60) AS `member_id`,
    GREATEST(
      1,
      LEAST(
        5,
        1 + MOD(e.`id` * 17 + 3, 5)
          + MOD(e.`id` * 13 + rs.n * 7, 3) - 1
      )
    ) AS `rating`,
    DATE_ADD(
      s.`start_time`,
      INTERVAL 1 + MOD(e.`id` * 3 + rs.n, 4) DAY
    ) AS `reviewed_at`
  FROM `experiences` AS e
  INNER JOIN review_seq AS rs
    ON rs.n <= (
      10 + MOD(e.`id` * 7, 6)
      - CASE WHEN e.`id` IN (1, 5) THEN 1 ELSE 0 END
    )
  INNER JOIN `order_items` AS oi
    ON oi.`id` = 260000 + e.`id` * 100 + rs.n
  INNER JOIN `sessions` AS s
    ON s.`id` = oi.`session_id`
)
SELECT
  360000 + gr.`experience_id` * 100 + gr.n,
  260000 + gr.`experience_id` * 100 + gr.n,
  gr.`experience_id`,
  gr.`member_id`,
  gr.`rating`,
  CONCAT(
    CASE gr.`rating`
      WHEN 5 THEN CONCAT(
        '參加「', gr.`title`, '」後非常驚喜，',
        CASE MOD(gr.n, 3)
          WHEN 0 THEN '帶領者講解細心，行程節奏與互動都安排得很好。'
          WHEN 1 THEN '現場氣氛自然，內容比預期更豐富，也留下很多美好回憶。'
          ELSE '集合、體驗到結束都很順暢，同行的人也一致覺得值得。'
        END
      )
      WHEN 4 THEN CONCAT(
        '「', gr.`title`, '」整體體驗很好，',
        CASE MOD(gr.n, 3)
          WHEN 0 THEN '工作人員很親切，主要內容都有達到期待。'
          WHEN 1 THEN '流程清楚而且不會太趕，只有少部分細節還能再調整。'
          ELSE '安排得很用心，若時間配置再寬鬆一點會更加完整。'
        END
      )
      WHEN 3 THEN CONCAT(
        '這次參加「', gr.`title`, '」的感受普通，',
        CASE MOD(gr.n, 3)
          WHEN 0 THEN '基本內容都有完成，但亮點和原先期待有些落差。'
          WHEN 1 THEN '服務態度不錯，只是部分環節等待時間稍長。'
          ELSE '適合第一次接觸的人，若內容再深入一些會更好。'
        END
      )
      WHEN 2 THEN CONCAT(
        '「', gr.`title`, '」這次沒有達到期待，',
        CASE MOD(gr.n, 3)
          WHEN 0 THEN '現場等待偏久，實際體驗內容也比介紹得簡單。'
          WHEN 1 THEN '流程銜接有些混亂，能感受到工作人員努力但仍需改善。'
          ELSE '時間安排較倉促，有幾個想體驗的部分沒有完整進行。'
        END
      )
      ELSE CONCAT(
        '這次對「', gr.`title`, '」的體驗不滿意，',
        CASE MOD(gr.n, 3)
          WHEN 0 THEN '現場安排與頁面說明差異明顯，等待時間也過長。'
          WHEN 1 THEN '流程多次延誤且缺乏清楚說明，希望後續能確實改善。'
          ELSE '重要環節沒有完成，服務回應也不夠即時，暫時不會推薦。'
        END
      )
    END,
    CASE MOD(gr.`experience_id` + gr.n, 4)
      WHEN 0 THEN ' 以這次經驗來說，之後會先確認行程細節再決定是否參加。'
      WHEN 1 THEN ' 整體感受與評分一致，提供給其他旅客參考。'
      WHEN 2 THEN ' 當天的實際狀況大致如此，希望能幫助後續安排。'
      ELSE ' 這是完成體驗後的真實感受。'
    END
  ),
  gr.`reviewed_at`,
  NULL
FROM generated_reviews AS gr;

-- 會員 101 的兩則評論：
-- AW26-101-01 為單商品已評論；
-- AW26-101-05 只評論第一項，第二項保留未評論。
INSERT INTO `experience_reviews` (
  `id`,
  `order_item_id`,
  `experience_id`,
  `member_id`,
  `rating`,
  `comment`,
  `created_at`,
  `image_url`
) VALUES
(
  399001,
  299001,
  1,
  101,
  5,
  '第一次完整走完下單、付款、參加到評論流程。「商品 1」的現場引導很清楚，整體安排順暢，適合作為成功評論流程測試。',
  '2026-02-14 16:20:00',
  NULL
),
(
  399002,
  299005,
  5,
  101,
  3,
  '這張訂單包含兩個商品，目前只先評論其中一項。體驗內容基本完整，但等待時間稍長，保留另一項未評論來測試後續流程。',
  '2026-07-22 18:10:00',
  NULL
);

COMMIT;

-- 驗證一：每個商品應有 10~15 則評論。
SELECT
  e.`id` AS `experience_id`,
  e.`title`,
  COUNT(er.`id`) AS `review_count`,
  ROUND(AVG(er.`rating`), 2) AS `average_rating`,
  MIN(er.`rating`) AS `minimum_rating`,
  MAX(er.`rating`) AS `maximum_rating`
FROM `experiences` AS e
LEFT JOIN `experience_reviews` AS er
  ON er.`experience_id` = e.`id`
GROUP BY e.`id`, e.`title`
HAVING COUNT(er.`id`) NOT BETWEEN 10 AND 15;

-- 驗證二：五個檢查欄位都應回傳 0。
SELECT
  SUM(er.`created_at` > '2026-07-29 23:59:59') AS `reviews_after_today`,
  SUM(er.`created_at` < om.`created_at`) AS `reviews_before_order`,
  SUM(er.`created_at` < s.`start_time`) AS `reviews_before_departure`,
  SUM(
    er.`created_at` > DATE_ADD(s.`start_time`, INTERVAL 4 DAY)
  ) AS `reviews_over_four_days_after_departure`,
  SUM(er.`member_id` IN (102, 103)) AS `excluded_member_reviews`
FROM `experience_reviews` AS er
INNER JOIN `order_items` AS oi
  ON oi.`id` = er.`order_item_id`
INNER JOIN `order_main` AS om
  ON om.`id` = oi.`order_id`
INNER JOIN `sessions` AS s
  ON s.`id` = oi.`session_id`;

-- 驗證三：會員 101 應有 5 張訂單、6 筆明細、2 筆評論。
SELECT
  (SELECT COUNT(*) FROM `order_main` WHERE `id` LIKE 'AW26-101-%') AS `member_101_orders`,
  (
    SELECT COUNT(*)
    FROM `order_items`
    WHERE `order_id` LIKE 'AW26-101-%'
  ) AS `member_101_items`,
  (
    SELECT COUNT(*)
    FROM `experience_reviews`
    WHERE `member_id` = 101
      AND `id` IN (399001, 399002)
  ) AS `member_101_reviews`;
