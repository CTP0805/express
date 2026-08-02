-- schema_reordered.sql
-- 已依照外鍵相依關係重新排序
-- 每個資料表都在 CREATE TABLE 時直接設定：
-- 1. PRIMARY KEY
-- 2. AUTO_INCREMENT
-- 3. INDEX / UNIQUE KEY
-- 4. FOREIGN KEY
--
-- 建議：先匯入此 schema，再匯入 seed.sql

CREATE DATABASE IF NOT EXISTS `final_project`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `final_project`;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

SET FOREIGN_KEY_CHECKS = 0;

-- ========================================================
-- 1. member
-- 無外鍵相依
-- ========================================================

CREATE TABLE `member` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` ENUM('男','女','其他') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birthday` DATE DEFAULT NULL,
  `avatar_url` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_level` ENUM('啟程旅人','探索旅人','環遊旅人') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '啟程旅人',
  `is_email_verified` DATETIME DEFAULT NULL,
  `google_uid` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_points` INT NOT NULL DEFAULT 0,
  `total_spent` INT NOT NULL DEFAULT 0,
  `total_orders` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `token_version` INT NOT NULL DEFAULT 1,
  `role` ENUM('管理者','客服','會員') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '會員',
  `city` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_member_email` (`email`),
  UNIQUE KEY `uk_member_google_uid` (`google_uid`),
  KEY `idx_member_level` (`member_level`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=104;

-- ========================================================
-- 2. coupons
-- 無外鍵相依
-- ========================================================

CREATE TABLE `coupons` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `coupon_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_spent` DECIMAL(10,2) NOT NULL,
  `discount_amount` DECIMAL(10,2) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,

  PRIMARY KEY (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- ========================================================
-- 3. hosts
-- 無外鍵相依
-- ========================================================

CREATE TABLE `hosts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `bio` TEXT COLLATE utf8mb4_unicode_ci,
  `avatar` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- ========================================================
-- 4. experience_categories
-- 無外鍵相依
-- ========================================================

CREATE TABLE `experience_categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon_url` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=7;

-- ========================================================
-- 5. experiences
-- 依賴：experience_categories、hosts
-- ========================================================

CREATE TABLE `experiences` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `host_id` INT NOT NULL,
  `city` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `meeting_point` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `longitude` DECIMAL(9,6) DEFAULT NULL,
  `latitude` DECIMAL(8,6) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_experiences_category_id` (`category_id`),
  KEY `idx_experiences_host_id` (`host_id`),

  CONSTRAINT `fk_experiences_category`
    FOREIGN KEY (`category_id`)
    REFERENCES `experience_categories` (`id`),

  CONSTRAINT `fk_experiences_host`
    FOREIGN KEY (`host_id`)
    REFERENCES `hosts` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- ========================================================
-- 6. sessions
-- 依賴：experiences
-- ========================================================

CREATE TABLE `sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `experience_id` INT NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `booking_deadline` DATETIME NOT NULL,
  `adult_price` DECIMAL(10,2) NOT NULL,
  `child_price` DECIMAL(10,2) NOT NULL,
  `min_participants` INT NOT NULL,
  `max_participants` INT NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_sessions_experience_id` (`experience_id`),

  CONSTRAINT `fk_sessions_experience`
    FOREIGN KEY (`experience_id`)
    REFERENCES `experiences` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- ========================================================
-- 7. experience_images
-- 依賴：experiences
-- ========================================================

CREATE TABLE `experience_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `experience_id` INT NOT NULL,
  `image_url` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` TINYINT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_experience_images_experience_id` (`experience_id`),

  CONSTRAINT `fk_experience_images_experience`
    FOREIGN KEY (`experience_id`)
    REFERENCES `experiences` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- ========================================================
-- 8. order_main
-- 依賴：member、coupons
-- ========================================================

CREATE TABLE `order_main` (
  `id` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `member_id` INT NOT NULL,
  `contact_name` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_phone` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_email` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_method` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_status` ENUM('pending','paid','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `original_amount` DECIMAL(10,2) NOT NULL,
  `coupon_id` INT DEFAULT NULL,
  `coupon_discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `points_redeemed` INT NOT NULL DEFAULT 0,
  `final_amount` DECIMAL(10,2) NOT NULL,
  `points_earned` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_order_main_member_id` (`member_id`),
  KEY `idx_order_main_coupon_id` (`coupon_id`),

  CONSTRAINT `fk_order_main_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `member` (`id`),

  CONSTRAINT `fk_order_main_coupon`
    FOREIGN KEY (`coupon_id`)
    REFERENCES `coupons` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 9. member_coupons
-- 依賴：member、coupons
-- ========================================================

CREATE TABLE `member_coupons` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `coupon_id` INT NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at` DATETIME DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_member_coupons_member_id` (`member_id`),
  KEY `idx_member_coupons_coupon_id` (`coupon_id`),

  CONSTRAINT `fk_member_coupons_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `member` (`id`),

  CONSTRAINT `fk_member_coupons_coupon`
    FOREIGN KEY (`coupon_id`)
    REFERENCES `coupons` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=631;

-- ========================================================
-- 10. order_items
-- 依賴：order_main、experiences、sessions
-- ========================================================

CREATE TABLE `order_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `experience_id` INT NOT NULL,
  `session_id` INT NOT NULL,
  `original_unit_price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `item_status` ENUM('pending','confirmed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `special_request` TEXT COLLATE utf8mb4_unicode_ci,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_experience_id` (`experience_id`),
  KEY `idx_order_items_session_id` (`session_id`),

  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_id`)
    REFERENCES `order_main` (`id`),

  CONSTRAINT `fk_order_items_experience`
    FOREIGN KEY (`experience_id`)
    REFERENCES `experiences` (`id`),

  CONSTRAINT `fk_order_items_session`
    FOREIGN KEY (`session_id`)
    REFERENCES `sessions` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=253;

-- ========================================================
-- 11. cart
-- 依賴：member、experiences、sessions
-- ========================================================

CREATE TABLE `cart` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `experience_id` INT NOT NULL,
  `session_id` INT NOT NULL,
  `adult_quantity` INT NOT NULL DEFAULT 1,
  `child_quantity` INT NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`),
  KEY `idx_cart_member_id` (`member_id`),
  KEY `idx_cart_experience_id` (`experience_id`),
  KEY `idx_cart_session_id` (`session_id`),

  CONSTRAINT `fk_cart_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `member` (`id`),

  CONSTRAINT `fk_cart_experience`
    FOREIGN KEY (`experience_id`)
    REFERENCES `experiences` (`id`),

  CONSTRAINT `fk_cart_session`
    FOREIGN KEY (`session_id`)
    REFERENCES `sessions` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- ========================================================
-- 12. favorites
-- 依賴：member、experiences
-- ========================================================

CREATE TABLE `favorites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `experience_id` INT NOT NULL,
  `member_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_favorites_member_experience` (`member_id`, `experience_id`),
  KEY `idx_favorites_experience_id` (`experience_id`),

  CONSTRAINT `fk_favorites_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `member` (`id`),

  CONSTRAINT `fk_favorites_experience`
    FOREIGN KEY (`experience_id`)
    REFERENCES `experiences` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- ========================================================
-- 13. experience_reviews
-- 依賴：order_items、experiences、member
-- ========================================================

CREATE TABLE `experience_reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_item_id` INT NOT NULL,
  `experience_id` INT NOT NULL,
  `member_id` INT NOT NULL,
  `rating` INT NOT NULL,
  `comment` VARCHAR(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `image_url` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_experience_reviews_order_item_id` (`order_item_id`),
  KEY `idx_experience_reviews_experience_id` (`experience_id`),
  KEY `idx_experience_reviews_member_id` (`member_id`),

  CONSTRAINT `fk_experience_reviews_order_item`
    FOREIGN KEY (`order_item_id`)
    REFERENCES `order_items` (`id`),

  CONSTRAINT `fk_experience_reviews_experience`
    FOREIGN KEY (`experience_id`)
    REFERENCES `experiences` (`id`),

  CONSTRAINT `fk_experience_reviews_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `member` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- experience_reviews_images

CREATE TABLE experience_review_images (
  id INT NOT NULL AUTO_INCREMENT,
  review_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_review_images_review_order (review_id, sort_order, id),

  CONSTRAINT fk_review_images_review
    FOREIGN KEY (review_id)
    REFERENCES experience_reviews(id)
    ON DELETE CASCADE
);

-- ========================================================
-- 14. posts
-- 依賴：member、experience_categories、order_items、experiences
-- ========================================================

CREATE TABLE `posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` LONGTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_image` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_image` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `published_at` DATETIME DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `author_id` INT NOT NULL,
  `category_id` INT DEFAULT NULL,
  `order_item_id` INT DEFAULT NULL,
  `experience_id` INT DEFAULT NULL,
  `review_note` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_posts_slug` (`slug`),
  UNIQUE KEY `uk_posts_order_item_id` (`order_item_id`),
  KEY `idx_posts_title` (`title`),
  KEY `idx_posts_author_id` (`author_id`),
  KEY `idx_posts_category_id` (`category_id`),
  KEY `idx_posts_experience_id` (`experience_id`),
  KEY `idx_posts_status_published` (`status`, `published_at`),

  CONSTRAINT `fk_posts_author`
    FOREIGN KEY (`author_id`)
    REFERENCES `member` (`id`),

  CONSTRAINT `fk_posts_category`
    FOREIGN KEY (`category_id`)
    REFERENCES `experience_categories` (`id`),

  CONSTRAINT `fk_posts_order_item`
    FOREIGN KEY (`order_item_id`)
    REFERENCES `order_items` (`id`),

  CONSTRAINT `fk_posts_experience`
    FOREIGN KEY (`experience_id`)
    REFERENCES `experiences` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=11;

-- ========================================================
-- 15. blog_comments
-- 依賴：posts、member
-- ========================================================

CREATE TABLE `blog_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `member_id` INT NOT NULL,
  `content` VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_blog_comments_post_created` (`post_id`, `created_at`),
  KEY `idx_blog_comments_member_id` (`member_id`),

  CONSTRAINT `fk_blog_comments_post`
    FOREIGN KEY (`post_id`)
    REFERENCES `posts` (`id`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_blog_comments_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `member` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 16. category_notes
-- 依賴：experience_categories
-- ========================================================

CREATE TABLE `category_notes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `title` VARCHAR(50) NOT NULL,
  `content` VARCHAR(255) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_category_notes_category_id` (`category_id`),

  CONSTRAINT `fk_category_notes_category`
    FOREIGN KEY (`category_id`)
    REFERENCES `experience_categories` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 17. chat_rooms
-- 依賴：member
-- ========================================================

CREATE TABLE `chat_rooms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_chat_rooms_user_id` (`user_id`),

  CONSTRAINT `fk_chat_rooms_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `member` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 18. chat_messages
-- 依賴：chat_rooms
-- ========================================================

CREATE TABLE `chat_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `room_id` INT NOT NULL,
  `sender` ENUM('user','admin') NOT NULL,
  `text` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`),
  KEY `idx_chat_messages_room_id` (`room_id`),

  CONSTRAINT `fk_chat_messages_room`
    FOREIGN KEY (`room_id`)
    REFERENCES `chat_rooms` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================
-- 19. recently_viewed
-- ========================================================

CREATE TABLE `recently_viewed` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `experience_id` INT NOT NULL,
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  UNIQUE KEY `uk_recently_viewed_member_experience` (
    `member_id`,
    `experience_id`
  ),

  KEY `idx_recently_viewed_member_time` (
    `member_id`,
    `viewed_at`,
    `id`
  ),

  CONSTRAINT `fk_recently_viewed_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `member` (`id`),

  CONSTRAINT `fk_recently_viewed_experience`
    FOREIGN KEY (`experience_id`)
    REFERENCES `experiences` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;




/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;