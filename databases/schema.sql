-- schema.sql
-- 資料表架構：CREATE TABLE、索引、AUTO_INCREMENT、外鍵
-- 使用方式：先匯入 schema.sql，再匯入 seed.sql
-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主機： 127.0.0.1
-- 產生時間： 2026-07-13 14:18:38
-- 伺服器版本： 8.0.45
-- PHP 版本： 8.1.25

CREATE DATABASE final_project;

USE final_project;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

START TRANSACTION;

SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;
/*!40101 SET NAMES utf8mb4 */
;

--
-- 資料庫： `final2`
--

-- --------------------------------------------------------

--
-- 資料表結構 `cart`
--

CREATE TABLE `cart` (
    `id` int NOT NULL,
    `member_id` int NOT NULL,
    `experience_id` int NOT NULL,
    `session_id` int NOT NULL,
    `quantity` int NOT NULL DEFAULT '1'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `cart`
--

-- --------------------------------------------------------

--
-- 資料表結構 `coupons`
--

CREATE TABLE `coupons` (
    `id` int NOT NULL,
    `coupon_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `min_spent` decimal(10, 2) NOT NULL,
    `discount_amount` decimal(10, 2) NOT NULL,
    `start_date` date NOT NULL,
    `end_date` date NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `coupons`
--

-- --------------------------------------------------------

--
-- 資料表結構 `experiences`
--

CREATE TABLE `experiences` (
    `id` int NOT NULL,
    `category_id` int NOT NULL,
    `host_id` int NOT NULL,
    `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
    `notice` text COLLATE utf8mb4_unicode_ci,
    `meeting_point` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `city` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `longitude` decimal(9, 6) DEFAULT NULL,
    `latitude` decimal(8, 6) DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `experiences`
--

-- --------------------------------------------------------

--
-- 資料表結構 `experience_categories`
--

CREATE TABLE `experience_categories` (
    `id` int NOT NULL,
    `category_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
    `icon_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `sort_order` int NOT NULL DEFAULT '0',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `experience_categories`
--

-- --------------------------------------------------------

--
-- 資料表結構 `experience_images`
--

CREATE TABLE `experience_images` (
    `id` int NOT NULL,
    `experience_id` int NOT NULL,
    `image_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `is_primary` tinyint NOT NULL DEFAULT '0',
    `sort_order` int NOT NULL DEFAULT '0',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `experience_images`
--

-- --------------------------------------------------------

--
-- 資料表結構 `experience_reviews`
--

CREATE TABLE `experience_reviews` (
    `id` int NOT NULL,
    `order_item_id` int NOT NULL,
    `experience_id` int NOT NULL,
    `member_id` int NOT NULL,
    `rating` int NOT NULL,
    `comment` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `experience_reviews`
--

-- --------------------------------------------------------

--
-- 資料表結構 `favorites`
--

CREATE TABLE `favorites` (
    `id` int NOT NULL,
    `experience_id` int NOT NULL,
    `member_id` int NOT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `favorites`
--

-- --------------------------------------------------------

--
-- 資料表結構 `hosts`
--

CREATE TABLE `hosts` (
    `id` int NOT NULL,
    `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `bio` text COLLATE utf8mb4_unicode_ci,
    `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `rating` int NOT NULL DEFAULT '5'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `hosts`
--

-- --------------------------------------------------------

--
-- 資料表結構 `member`
--

CREATE TABLE `member` (
    `id` int NOT NULL ,
    `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `gender` enum('男','女','其他') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `birthday` date DEFAULT NULL,
    `avatar_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `member_level` enum('銅','銀','金') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '銅',
    `is_email_verified` datetime DEFAULT NULL,
    `google_uid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `current_points` int NOT NULL DEFAULT '0',
    `total_spent` int NOT NULL DEFAULT '0',
    `total_orders` int NOT NULL DEFAULT '0',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `token_version` int NOT NULL DEFAULT '1',
    `role` enum('管理者','客服','會員') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '會員',
    `city` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


--
-- 傾印資料表的資料 `member`
--

-- --------------------------------------------------------

--
-- 資料表結構 `member_coupons`
--

CREATE TABLE `member_coupons` (
    `id` int NOT NULL,
    `member_id` int NOT NULL,
    `coupon_id` int NOT NULL,
    `is_used` tinyint(1) NOT NULL DEFAULT '0',
    `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `used_at` datetime DEFAULT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `member_coupons`
--

-- --------------------------------------------------------

--
-- 資料表結構 `order_items`
--

CREATE TABLE `order_items` (
    `id` int NOT NULL,
    `order_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    `experience_id` int NOT NULL,
    `session_id` int NOT NULL,
    `original_unit_price` decimal(10, 2) NOT NULL,
    `quantity` int NOT NULL,
    `subtotal` decimal(10, 2) NOT NULL,
    `item_status` enum(
        'pending',
        'confirmed',
        'cancelled'
    ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
    `special_request` text COLLATE utf8mb4_unicode_ci,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `order_items`
--

-- --------------------------------------------------------

--
-- 資料表結構 `order_main`
--

CREATE TABLE `order_main` (
    `id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    `member_id` int NOT NULL,
    `contact_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
    `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    `order_status` enum(
        'pending',
        'paid',
        'cancelled'
    ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
    `original_amount` decimal(10, 2) NOT NULL,
    `coupon_id` int DEFAULT NULL,
    `coupon_discount` decimal(10, 2) NOT NULL DEFAULT '0.00',
    `points_redeemed` int NOT NULL DEFAULT '0',
    `final_amount` decimal(10, 2) NOT NULL,
    `points_earned` int NOT NULL DEFAULT '0',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `order_main`
--

-- --------------------------------------------------------

--
-- 資料表結構 `posts`
--

CREATE TABLE `posts` (
    `id` bigint UNSIGNED NOT NULL,
    `title` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
    `excerpt` text COLLATE utf8mb4_unicode_ci,
    `cover_image` text COLLATE utf8mb4_unicode_ci COMMENT 'cover image URL or media id',
    `content_image` text COLLATE utf8mb4_unicode_ci COMMENT 'content image URL or media id',
    `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
    `published_at` datetime DEFAULT NULL,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `author_id` int NOT NULL,
    `category_id` int DEFAULT NULL,
    `review_note` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '管理者審查／退回原因（阿偉）'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `posts`
--

-- --------------------------------------------------------

--
-- 資料表結構 `sessions`
--

CREATE TABLE `sessions` (
    `id` int NOT NULL,
    `experience_id` int NOT NULL,
    `start_time` datetime NOT NULL,
    `end_time` datetime NOT NULL,
    `booking_deadline` datetime NOT NULL,
    `adult_price` decimal(10, 2) NOT NULL,
    `child_price` decimal(10, 2) NOT NULL,
    `min_participants` int NOT NULL,
    `max_participants` int NOT NULL,
    `status` tinyint NOT NULL DEFAULT '1',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `sessions`
--

--
-- 已傾印資料表的索引
--

--
-- 資料表索引 `cart`
--
ALTER TABLE `cart`
ADD PRIMARY KEY (`id`),
ADD KEY `idx_cart_member_id` (`member_id`),
ADD KEY `idx_cart_experience_id` (`experience_id`),
ADD KEY `idx_cart_session_id` (`session_id`);

--
-- 資料表索引 `coupons`
--
ALTER TABLE `coupons` ADD PRIMARY KEY (`id`);

--
-- 資料表索引 `experiences`
--
ALTER TABLE `experiences`
ADD PRIMARY KEY (`id`),
ADD KEY `idx_experiences_category_id` (`category_id`),
ADD KEY `idx_experiences_host_id` (`host_id`);

--
-- 資料表索引 `experience_categories`
--
ALTER TABLE `experience_categories` ADD PRIMARY KEY (`id`);

--
-- 資料表索引 `experience_images`
--
ALTER TABLE `experience_images`
ADD PRIMARY KEY (`id`),
ADD KEY `idx_experience_images_experience_id` (`experience_id`);

--
-- 資料表索引 `experience_reviews`
--
ALTER TABLE `experience_reviews`
ADD PRIMARY KEY (`id`),
ADD KEY `idx_experience_reviews_order_item_id` (`order_item_id`),
ADD KEY `idx_experience_reviews_experience_id` (`experience_id`),
ADD KEY `idx_experience_reviews_member_id` (`member_id`);

--
-- 資料表索引 `favorites`
--
ALTER TABLE `favorites`
ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `uk_favorites_member_experience` (`member_id`, `experience_id`),
ADD KEY `idx_favorites_experience_id` (`experience_id`);

--
-- 資料表索引 `hosts`
--
ALTER TABLE `hosts` ADD PRIMARY KEY (`id`);

--
-- 資料表索引 `member`
--
ALTER TABLE `member`
ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `uk_member_email` (`email`),
ADD UNIQUE KEY `uk_member_google_uid` (`google_uid`),
ADD KEY `idx_member_level` (`member_level`);

--
-- 資料表索引 `member_coupons`
--
ALTER TABLE `member_coupons`
ADD PRIMARY KEY (`id`),
ADD KEY `idx_member_coupons_member_id` (`member_id`),
ADD KEY `idx_member_coupons_coupon_id` (`coupon_id`);

--
-- 資料表索引 `order_items`
--
ALTER TABLE `order_items`
ADD PRIMARY KEY (`id`),
ADD KEY `idx_order_items_order_id` (`order_id`),
ADD KEY `idx_order_items_experience_id` (`experience_id`),
ADD KEY `idx_order_items_session_id` (`session_id`);

--
-- 資料表索引 `order_main`
--
ALTER TABLE `order_main`
ADD PRIMARY KEY (`id`),
ADD KEY `idx_order_main_member_id` (`member_id`),
ADD KEY `idx_order_main_coupon_id` (`coupon_id`);

--
-- 資料表索引 `posts`
--
ALTER TABLE `posts`
ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `uk_posts_slug` (`slug`),
ADD KEY `idx_posts_author_id` (`author_id`),
ADD KEY `idx_posts_category_id` (`category_id`),
ADD KEY `idx_posts_status_published` (`status`, `published_at`),
ADD KEY `idx_posts_title` (`title`);

--
-- 資料表索引 `sessions`
--
ALTER TABLE `sessions`
ADD PRIMARY KEY (`id`),
ADD KEY `idx_sessions_experience_id` (`experience_id`);

--
-- 在傾印的資料表使用自動遞增(AUTO_INCREMENT)
--

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `cart`
--
ALTER TABLE `cart`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `coupons`
--
ALTER TABLE `coupons`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `experiences`
--
ALTER TABLE `experiences`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `experience_categories`
--
ALTER TABLE `experience_categories`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 7;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `experience_images`
--
ALTER TABLE `experience_images`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `experience_reviews`
--
ALTER TABLE `experience_reviews`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `favorites`
--
ALTER TABLE `favorites`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `hosts`
--
ALTER TABLE `hosts`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `member`
--
ALTER TABLE `member`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 104;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `member_coupons`
--
ALTER TABLE `member_coupons`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 631;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `order_items`
--
ALTER TABLE `order_items`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 253;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `posts`
--
ALTER TABLE `posts`
MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `sessions`
--
ALTER TABLE `sessions`
MODIFY `id` int NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 已傾印資料表的限制式
--

--
-- 資料表的限制式 `cart`
--
ALTER TABLE `cart`
ADD CONSTRAINT `fk_cart_experience` FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`),
ADD CONSTRAINT `fk_cart_member` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`),
ADD CONSTRAINT `fk_cart_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`);

--
-- 資料表的限制式 `experiences`
--
ALTER TABLE `experiences`
ADD CONSTRAINT `fk_experiences_category` FOREIGN KEY (`category_id`) REFERENCES `experience_categories` (`id`),
ADD CONSTRAINT `fk_experiences_host` FOREIGN KEY (`host_id`) REFERENCES `hosts` (`id`);

--
-- 資料表的限制式 `experience_images`
--
ALTER TABLE `experience_images`
ADD CONSTRAINT `fk_experience_images_experience` FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`);

--
-- 資料表的限制式 `experience_reviews`
--
ALTER TABLE `experience_reviews`
ADD CONSTRAINT `fk_experience_reviews_experience` FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`),
ADD CONSTRAINT `fk_experience_reviews_member` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`),
ADD CONSTRAINT `fk_experience_reviews_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`);

--
-- 資料表的限制式 `favorites`
--
ALTER TABLE `favorites`
ADD CONSTRAINT `fk_favorites_experience` FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`),
ADD CONSTRAINT `fk_favorites_member` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`);

--
-- 資料表的限制式 `member_coupons`
--
ALTER TABLE `member_coupons`
ADD CONSTRAINT `fk_member_coupons_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`),
ADD CONSTRAINT `fk_member_coupons_member` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`);

--
-- 資料表的限制式 `order_items`
--
ALTER TABLE `order_items`
ADD CONSTRAINT `fk_order_items_experience` FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`),
ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `order_main` (`id`),
ADD CONSTRAINT `fk_order_items_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`);

--
-- 資料表的限制式 `order_main`
--
ALTER TABLE `order_main`
ADD CONSTRAINT `fk_order_main_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`),
ADD CONSTRAINT `fk_order_main_member` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`);

--
-- 資料表的限制式 `posts`
--
ALTER TABLE `posts`
ADD CONSTRAINT `fk_posts_author` FOREIGN KEY (`author_id`) REFERENCES `member` (`id`);

--
-- 資料表的限制式 `sessions`
--
ALTER TABLE `sessions`
ADD CONSTRAINT `fk_sessions_experience` FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`);

COMMIT;

-- hosts資料表加一個欄位

CREATE TABLE category_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  title VARCHAR(50) NOT NULL,
  content VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

-- 加上注意事項的資料表（每個分類分別有對應的注意事項）
CONSTRAINT fk_category_notes_category
    FOREIGN KEY (category_id)
    REFERENCES experience_categories(id)
    ON DELETE CASCADE
);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;