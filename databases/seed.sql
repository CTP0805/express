-- seed.sql
-- 假資料：INSERT INTO 測試資料
-- 使用方式：請先匯入 schema.sql，再匯入這個檔案

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;
START TRANSACTION;

--
-- Ordered seed data: parent tables first, child tables later
-- 匯入順序：先匯入 schema.sql，再匯入這個 seed_ordered.sql
--

-- --------------------------------------------------------
-- Seed data for `member`
INSERT INTO `member` (
  `id`, `name`, `email`, `password_hash`, `phone`, `gender`, `birthday`,
  `avatar_url`, `member_level`, `is_email_verified`, `google_uid`,
  `current_points`, `total_spent`, `total_orders`,
  `created_at`, `updated_at`, `token_version`, `role`, `city`
) VALUES
(1, '陳柏宇', 'chen.boyu@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0912345678', '男', '1995-03-18', '/avatars/default/men/1.jpg', '金', '2025-01-12 09:15:00', NULL, 2450, 38600, 18, '2024-03-05 10:20:00', '2025-06-18 14:30:00', 1, '會員', '台北市'),
(2, '林冠廷', 'lin.guanding@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '1998-11-02', '/avatars/default/men/2.jpg', '銀', '2024-08-21 16:42:00', NULL, 860, 12450, 7, '2024-04-12 15:10:00', '2025-05-09 11:25:00', 1, '會員', '新北市'),
(3, '黃志豪', 'huang.zhihao@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0987654321', '男', NULL, '/avatars/default/men/3.jpg', '銅', NULL, NULL, 120, 2450, 2, '2024-05-01 08:30:00', '2025-04-22 19:05:00', 1, '會員', '台中市'),
(4, '張家豪', 'chang.jiahao@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0923456789', '男', '1992-07-25', '/avatars/default/men/4.jpg', '金', '2024-06-08 12:20:00', NULL, 4320, 68700, 31, '2024-01-18 13:45:00', '2025-07-02 09:10:00', 2, '會員', '桃園市'),
(5, '李承恩', 'li.chengen@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '2000-01-14', '/avatars/default/men/5.jpg', '銅', '2025-02-15 10:00:00', NULL, 50, 980, 1, '2025-02-15 09:50:00', '2025-02-15 10:00:00', 1, '會員', '台南市'),
(6, '王俊傑', 'wang.junjie@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0934567890', '男', '1989-09-08', '/avatars/default/men/6.jpg', '銀', '2024-03-22 14:18:00', NULL, 1560, 25100, 14, '2024-03-20 14:00:00', '2025-06-01 17:40:00', 1, '會員', '高雄市'),
(7, '吳宇軒', 'wu.yuxuan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0955123456', '男', NULL, '/avatars/default/men/7.jpg', '銅', '2025-03-03 08:25:00', NULL, 280, 4300, 3, '2025-03-02 21:15:00', '2025-06-20 13:05:00', 1, '會員', '新竹市'),
(8, '劉建宏', 'liu.jianhong@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '1985-12-30', '/avatars/default/men/8.jpg', '金', '2024-02-10 11:30:00', NULL, 6780, 105200, 52, '2023-11-07 09:10:00', '2025-07-10 16:22:00', 1, '會員', '台北市'),
(9, '蔡明哲', 'cai.mingzhe@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0977123456', '男', '1997-05-11', '/avatars/default/men/9.jpg', '銀', '2024-10-05 18:00:00', NULL, 990, 15980, 9, '2024-09-28 12:45:00', '2025-05-15 10:35:00', 1, '會員', '彰化縣'),
(10, '楊子維', 'yang.ziwei@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0966234567', '男', NULL, '/avatars/default/men/10.jpg', '銅', NULL, NULL, 0, 0, 0, '2025-07-01 09:00:00', '2025-07-01 09:00:00', 1, '會員', '台中市'),
(11, '許博翔', 'xu.boxiang@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '1993-04-19', '/avatars/default/men/11.jpg', '銀', '2024-07-14 13:50:00', NULL, 1870, 30200, 16, '2024-06-29 16:30:00', '2025-06-28 20:10:00', 1, '會員', '嘉義市'),
(12, '鄭凱文', 'zheng.kaiwen@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0908123456', '男', '1996-08-22', '/avatars/default/men/12.jpg', '銅', '2025-01-08 15:45:00', NULL, 430, 7250, 4, '2024-12-20 11:20:00', '2025-06-05 12:00:00', 1, '會員', '新北市'),
(13, '謝宗翰', 'xie.zonghan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0918765432', '男', NULL, '/avatars/default/men/13.jpg', '銅', '2025-04-18 09:10:00', NULL, 160, 2800, 2, '2025-04-16 14:00:00', '2025-05-22 18:35:00', 1, '會員', '宜蘭縣'),
(14, '郭書豪', 'guo.shuhao@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '1991-02-06', '/avatars/default/men/14.jpg', '金', '2024-01-25 10:22:00', NULL, 5030, 81700, 39, '2023-08-10 08:45:00', '2025-07-12 11:30:00', 2, '會員', '台北市'),
(15, '洪偉倫', 'hong.weilun@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0945123456', '男', '1999-06-28', '/avatars/default/men/15.jpg', '銀', '2024-11-20 19:15:00', NULL, 1320, 21350, 11, '2024-11-18 10:15:00', '2025-06-11 14:50:00', 1, '會員', '屏東縣'),
(16, '邱柏翰', 'qiu.bohan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '1988-10-17', '/avatars/default/men/16.jpg', '金', '2024-05-30 11:05:00', NULL, 7210, 118900, 58, '2024-01-03 15:45:00', '2025-07-16 09:20:00', 1, '會員', '桃園市'),
(17, '曾俊霖', 'zeng.junlin@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0928123456', '男', NULL, '/avatars/default/men/17.jpg', '銅', NULL, NULL, 0, 0, 0, '2025-07-08 17:20:00', '2025-07-08 17:20:00', 1, '會員', '花蓮縣'),
(18, '廖威廷', 'liao.weiting@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0933123456', '男', '1994-03-04', '/avatars/default/men/18.jpg', '銀', '2024-09-12 14:00:00', NULL, 2100, 34700, 19, '2024-08-25 09:30:00', '2025-06-30 13:25:00', 1, '會員', '台中市'),
(19, '賴冠宇', 'lai.guanyu@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '1990-07-16', '/avatars/default/men/19.jpg', '金', '2024-04-07 16:10:00', NULL, 3890, 62100, 29, '2024-02-12 11:40:00', '2025-07-03 15:10:00', 1, '會員', '新竹縣'),
(20, '蘇彥廷', 'su.yanting@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0978123456', '男', NULL, '/avatars/default/men/20.jpg', '銅', '2025-05-06 10:30:00', NULL, 300, 5180, 3, '2025-05-01 13:20:00', '2025-07-05 09:45:00', 1, '會員', '台南市'),
(21, '徐正宇', 'xu.zhengyu@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '2001-09-12', '/avatars/default/men/21.jpg', '銅', '2025-06-02 12:00:00', NULL, 80, 1200, 1, '2025-06-01 19:40:00', '2025-06-25 08:15:00', 1, '會員', '高雄市'),
(22, '何承翰', 'he.chenghan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0909123456', '男', '1995-01-31', '/avatars/default/men/22.jpg', '銀', '2024-12-08 18:30:00', NULL, 1140, 18400, 10, '2024-10-22 14:15:00', '2025-07-09 16:05:00', 1, '會員', '台北市'),
(23, '高子軒', 'gao.zixuan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', NULL, '/avatars/default/men/23.jpg', '銅', NULL, NULL, 0, 0, 0, '2025-07-15 10:05:00', '2025-07-15 10:05:00', 1, '會員', '基隆市'),
(24, '羅士傑', 'luo.shijie@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0956123456', '男', '1987-11-09', '/avatars/default/men/24.jpg', '金', '2024-03-16 09:55:00', NULL, 8490, 136500, 67, '2023-10-05 08:00:00', '2025-07-18 12:30:00', 2, '會員', '台中市'),
(25, '梁育誠', 'liang.yucheng@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '1996-04-27', '/avatars/default/men/25.jpg', '銀', '2024-08-09 13:30:00', NULL, 1760, 28600, 15, '2024-07-30 10:10:00', '2025-06-17 19:20:00', 1, '會員', '雲林縣'),
(26, '宋柏勳', 'song.boxun@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0911123456', '男', NULL, '/avatars/default/men/26.jpg', '銅', '2025-02-24 17:45:00', NULL, 540, 8900, 5, '2025-02-20 15:00:00', '2025-06-08 10:25:00', 1, '會員', '嘉義縣'),
(27, '方奕辰', 'fang.yichen@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', '1993-08-03', '/avatars/default/men/27.jpg', '銀', '2024-06-15 11:10:00', NULL, 2250, 36200, 18, '2024-05-12 09:20:00', '2025-07-01 14:40:00', 1, '會員', '新北市'),
(28, '杜俊賢', 'du.junxian@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0946123456', '男', '1998-02-20', '/avatars/default/men/28.jpg', '銅', '2025-01-31 08:40:00', NULL, 680, 11200, 6, '2025-01-25 13:10:00', '2025-07-14 18:10:00', 1, '會員', '苗栗縣'),
(29, '程浩然', 'cheng.haoran@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '男', NULL, '/avatars/default/men/29.jpg', '銅', NULL, NULL, 30, 500, 1, '2025-06-30 08:20:00', '2025-07-12 09:50:00', 1, '會員', '台東縣'),
(30, '鍾睿哲', 'zhong.ruizhe@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0988123456', '男', '1991-06-15', '/avatars/default/men/30.jpg', '金', '2024-02-28 15:20:00', NULL, 5680, 91500, 43, '2023-12-18 16:00:00', '2025-07-17 11:15:00', 1, '會員', '台北市'),
(31, '林雅婷', 'lin.yating@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0919234567', '女', '1996-05-23', '/avatars/default/women/1.jpg', '金', '2024-04-12 10:30:00', NULL, 4620, 74200, 36, '2024-01-25 11:10:00', '2025-07-11 13:50:00', 1, '會員', '台北市'),
(32, '陳怡君', 'chen.yijun@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1993-10-08', '/avatars/default/women/2.jpg', '銀', '2024-09-03 09:25:00', NULL, 1980, 32100, 17, '2024-08-18 14:30:00', '2025-06-23 16:15:00', 1, '會員', '新北市'),
(33, '張芸瑄', 'chang.yunxuan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0922345678', '女', NULL, '/avatars/default/women/3.jpg', '銅', '2025-03-28 14:10:00', NULL, 340, 5600, 3, '2025-03-26 10:20:00', '2025-06-15 09:30:00', 1, '會員', '桃園市'),
(34, '黃詩涵', 'huang.shihan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0935234567', '女', '1998-01-16', '/avatars/default/women/4.jpg', '銅', '2025-02-01 11:45:00', NULL, 710, 11700, 6, '2025-01-28 08:40:00', '2025-07-06 17:20:00', 1, '會員', '台中市'),
(35, '李欣妤', 'li.xinyu@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1990-06-30', '/avatars/default/women/5.jpg', '金', '2024-05-18 15:30:00', NULL, 7560, 120800, 61, '2023-09-15 09:10:00', '2025-07-19 10:45:00', 2, '會員', '高雄市'),
(36, '王筱晴', 'wang.xiaoqing@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0971234567', '女', NULL, '/avatars/default/women/6.jpg', '銅', NULL, NULL, 0, 0, 0, '2025-07-10 12:15:00', '2025-07-10 12:15:00', 1, '會員', '台南市'),
(37, '吳佩珊', 'wu.peishan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1995-09-14', '/avatars/default/women/7.jpg', '銀', '2024-11-06 18:40:00', NULL, 1480, 23900, 13, '2024-10-30 13:00:00', '2025-06-12 15:30:00', 1, '會員', '新竹市'),
(38, '劉雨柔', 'liu.yurou@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0967234567', '女', '2000-03-05', '/avatars/default/women/8.jpg', '銅', '2025-05-12 10:00:00', NULL, 190, 3150, 2, '2025-05-10 16:30:00', '2025-06-29 11:40:00', 1, '會員', '台北市'),
(39, '蔡宜臻', 'cai.yizhen@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1992-12-21', '/avatars/default/women/9.jpg', '銀', '2024-07-22 09:50:00', NULL, 2540, 41100, 21, '2024-06-30 15:20:00', '2025-07-04 18:10:00', 1, '會員', '彰化縣'),
(40, '楊思妤', 'yang.siyu@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0955234567', '女', NULL, '/avatars/default/women/10.jpg', '銅', '2025-06-09 13:15:00', NULL, 90, 1500, 1, '2025-06-08 10:45:00', '2025-07-08 14:25:00', 1, '會員', '嘉義市'),
(41, '許婉庭', 'xu.wanting@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1989-08-18', '/avatars/default/women/11.jpg', '金', '2024-02-20 11:25:00', NULL, 6350, 101600, 49, '2023-11-22 14:30:00', '2025-07-15 09:10:00', 1, '會員', '新北市'),
(42, '鄭佳穎', 'zheng.jiaying@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0908234567', '女', '1997-04-01', '/avatars/default/women/12.jpg', '銀', '2024-12-14 16:20:00', NULL, 1640, 26700, 14, '2024-11-25 10:00:00', '2025-06-24 13:15:00', 1, '會員', '台中市'),
(43, '謝依庭', 'xie.yiting@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', NULL, '/avatars/default/women/13.jpg', '銅', NULL, NULL, 0, 0, 0, '2025-07-14 08:30:00', '2025-07-14 08:30:00', 1, '會員', '宜蘭縣'),
(44, '郭芷晴', 'guo.zhiqing@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0945234567', '女', '1994-07-09', '/avatars/default/women/14.jpg', '銀', '2024-08-28 12:10:00', NULL, 2190, 35400, 18, '2024-08-10 09:15:00', '2025-07-02 16:50:00', 1, '會員', '桃園市'),
(45, '洪語彤', 'hong.yutong@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1999-11-26', '/avatars/default/women/15.jpg', '銅', '2025-01-19 17:55:00', NULL, 460, 7600, 4, '2025-01-16 11:30:00', '2025-06-03 10:10:00', 1, '會員', '屏東縣'),
(46, '邱鈺婷', 'qiu.yuting@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0981234567', '女', NULL, '/avatars/default/women/16.jpg', '銅', '2025-04-05 09:35:00', NULL, 250, 4150, 2, '2025-04-03 18:25:00', '2025-06-21 15:00:00', 1, '會員', '花蓮縣'),
(47, '曾心怡', 'zeng.xinyi@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1991-02-13', '/avatars/default/women/17.jpg', '金', '2024-03-10 10:45:00', NULL, 5870, 94600, 45, '2023-12-05 13:30:00', '2025-07-17 17:40:00', 1, '會員', '台北市'),
(48, '廖品妍', 'liao.pinyan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0929234567', '女', '1996-06-07', '/avatars/default/women/18.jpg', '銀', '2024-10-16 14:35:00', NULL, 1210, 19600, 10, '2024-10-01 09:00:00', '2025-06-10 12:25:00', 1, '會員', '高雄市'),
(49, '賴郁雯', 'lai.yuwen@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', NULL, '/avatars/default/women/19.jpg', '銅', '2025-05-25 11:20:00', NULL, 110, 1800, 1, '2025-05-23 10:45:00', '2025-06-26 14:10:00', 1, '會員', '新竹縣'),
(50, '蘇靜怡', 'su.jingyi@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0934234567', '女', '1988-09-29', '/avatars/default/women/20.jpg', '金', '2024-01-15 15:15:00', NULL, 9140, 147300, 72, '2023-07-18 08:50:00', '2025-07-18 10:30:00', 2, '會員', '台中市'),
(51, '徐若琳', 'xu.ruolin@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1995-03-16', '/avatars/default/women/21.jpg', '銀', '2024-06-20 18:15:00', NULL, 1930, 31300, 16, '2024-06-12 11:20:00', '2025-07-07 09:40:00', 1, '會員', '台南市'),
(52, '何佳蓉', 'he.jiarong@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0968234567', '女', NULL, '/avatars/default/women/22.jpg', '銅', '2025-02-08 10:50:00', NULL, 520, 8500, 5, '2025-02-05 14:10:00', '2025-06-16 18:20:00', 1, '會員', '雲林縣'),
(53, '高雅雯', 'gao.yawen@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '1992-05-02', '/avatars/default/women/23.jpg', '銀', '2024-07-01 09:30:00', NULL, 2370, 38400, 20, '2024-06-20 08:15:00', '2025-07-13 16:00:00', 1, '會員', '台北市'),
(54, '羅欣儀', 'luo.xinyi@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0956234567', '女', '1998-08-11', '/avatars/default/women/24.jpg', '銅', '2025-03-12 13:40:00', NULL, 390, 6400, 3, '2025-03-10 09:55:00', '2025-06-27 11:15:00', 1, '會員', '基隆市'),
(55, '梁舒涵', 'liang.shuhan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', NULL, '/avatars/default/women/25.jpg', '銅', NULL, NULL, 0, 0, 0, '2025-07-16 15:40:00', '2025-07-16 15:40:00', 1, '會員', '苗栗縣'),
(56, '宋婕妤', 'song.jieyu@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0912234567', '女', '1994-01-24', '/avatars/default/women/26.jpg', '銀', '2024-09-30 17:00:00', NULL, 1450, 23500, 12, '2024-09-12 12:40:00', '2025-06-06 10:05:00', 1, '會員', '嘉義縣'),
(57, '方芝羽', 'fang.zhiyu@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', '2001-07-19', '/avatars/default/women/27.jpg', '銅', '2025-06-28 09:10:00', NULL, 60, 1000, 1, '2025-06-27 16:20:00', '2025-07-15 12:00:00', 1, '會員', '台東縣'),
(58, '杜怡萱', 'du.yixuan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0947234567', '女', '1993-11-05', '/avatars/default/women/28.jpg', '金', '2024-04-25 12:30:00', NULL, 4730, 76100, 37, '2024-02-28 10:30:00', '2025-07-08 18:35:00', 1, '會員', '新北市'),
(59, '程安琪', 'cheng.anqi@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, '女', NULL, '/avatars/default/women/29.jpg', '銅', '2025-04-29 16:10:00', NULL, 240, 3950, 2, '2025-04-27 10:10:00', '2025-06-22 14:20:00', 1, '會員', '嘉義市'),
(60, '鍾語嫣', 'zhong.yuyan@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0989234567', '女', '1990-04-12', '/avatars/default/women/30.jpg', '金', '2024-02-05 09:20:00', NULL, 6940, 111500, 54, '2023-10-30 15:20:00', '2025-07-20 08:30:00', 2, '會員', '桃園市'),
(101, '一般會員(測試)', 'member@example.com', '$2b$10$ULh5GqF3nEDSpzB82gWx8O.AtcZvB3sjKHswYngrNPouEf8GBy6s6', NULL, NULL, NULL, NULL, '銅', '2026-07-18 11:40:45', NULL, 0, 0, 0, '2026-07-21 09:42:45', '2026-07-21 09:44:46', 1, '會員', NULL),
(102, '管理員(測試)', 'admin@example.com', '$2b$10$ULh5GqF3nEDSpzB82gWx8O.AtcZvB3sjKHswYngrNPouEf8GBy6s6', NULL, NULL, NULL, NULL, '銅', '2026-07-18 11:40:45', NULL, 0, 0, 0, '2026-07-21 09:44:46', '2026-07-21 09:44:46', 1, '管理者', NULL),
(103, '客服(測試)', 'support@example.com', '$2b$10$ULh5GqF3nEDSpzB82gWx8O.AtcZvB3sjKHswYngrNPouEf8GBy6s6', NULL, NULL, NULL, NULL, '銅', '2026-07-18 11:40:45', NULL, 0, 0, 0, '2026-07-21 09:46:55', '2026-07-21 09:46:55', 1, '客服', NULL);

-- --------------------------------------------------------
-- Seed data for `coupons`
INSERT INTO `coupons` (`id`, `coupon_name`, `min_spent`, `discount_amount`, `start_date`, `end_date`) VALUES
(1, '歐洲初體驗折扣', 3000.00, 300.00, '2026-07-01', '2026-09-30'),
(2, '暑假城市漫遊券', 5000.00, 600.00, '2026-07-01', '2026-08-31'),
(3, '雙人同行優惠', 8000.00, 1000.00, '2026-07-10', '2026-10-10'),
(4, '美食體驗折扣', 2500.00, 250.00, '2026-07-01', '2026-12-31'),
(5, '酒莊品飲優惠', 6000.00, 700.00, '2026-08-01', '2026-11-30'),
(6, '親子同行折扣', 4000.00, 450.00, '2026-07-15', '2026-10-31'),
(7, '旅拍加購券', 7000.00, 900.00, '2026-07-01', '2026-09-15'),
(8, '文化路線優惠', 3500.00, 350.00, '2026-07-01', '2026-12-15'),
(9, '週末限定券', 2000.00, 200.00, '2026-07-01', '2026-08-31'),
(10, '黃金會員優惠卷', 200.00, 200.00, '2026-07-01', '2026-12-31');

-- --------------------------------------------------------
-- Seed data for `experience_categories`
INSERT INTO `experience_categories` (`id`, `category_name`, `icon_url`, `sort_order`, `created_at`) VALUES
(1, '古蹟巡禮', '/icons/city-walk.svg', 1, '2026-07-13 12:00:00'),
(2, '藝文導覽', '/icons/food.svg', 2, '2026-07-13 12:00:00'),
(3, '美饌饗宴', '/icons/art.svg', 3, '2026-07-13 12:00:00'),
(4, '戶外探索', '/icons/outdoor.svg', 4, '2026-07-13 12:00:00'),
(5, '專人攝影', '/icons/history.svg', 5, '2026-07-13 12:00:00'),
(6, '娛樂與夜生活', '/icons/wine.svg', 6, '2026-07-13 12:00:00');

-- --------------------------------------------------------
-- Seed data for `hosts`
INSERT INTO `hosts` (`id`, `name`, `role`,`bio`, `avatar`, `rating`) VALUES
(1, 'Sofia Rossi','歷史導覽員','羅馬在地導覽員，熟悉古城巷弄與義式咖啡文化。', '/images/experiences/avatars/host-sofia.jpg', 5),
(2, 'Lukas Weber','歷史導覽員', '慕尼黑料理老師，擅長巴伐利亞家常菜與啤酒文化。', '/images/experiences/avatars/host-lukas.jpg', 5),
(3, 'Claire Dubois','歷史導覽員', '巴黎藝術史研究者，帶旅人用輕鬆方式看懂博物館。', '/images/experiences/avatars/host-claire.jpg', 5),
(4, 'Anna Novak','歷史導覽員', '布拉格戶外嚮導，喜歡分享河岸步道與城市傳說。', '/images/experiences/avatars/host-anna.jpg', 4),
(5, 'Marco Bianchi','歷史導覽員', '佛羅倫斯歷史導覽員，專長文藝復興建築與街區故事。', '/images/experiences/avatars/host-marco.jpg', 5),
(6, 'Elena Garcia','歷史導覽員', '西班牙品酒師，熟悉里奧哈葡萄酒與小酒館文化。', '/images/experiences/avatars/host-elena.jpg', 5),
(7, 'Ingrid Hansen','歷史導覽員', '哥本哈根陶藝職人，開設小班制手作體驗。', '/images/experiences/avatars/host-ingrid.jpg', 4),
(8, 'Mateo Alvarez','歷史導覽員', '巴塞隆納吉他手，長期參與佛朗明哥演出。', '/images/experiences/avatars/host-mateo.jpg', 5),
(9, 'Emma Clarke','歷史導覽員', '倫敦旅拍攝影師，擅長自然光人像與街景構圖。', '/images/experiences/avatars/host-emma.jpg', 5),
(10, 'Nora Schneider','歷史導覽員', '維也納親子活動規劃師，設計適合家庭的文化路線。', '/images/experiences/avatars/host-nora.jpg', 4);

-- --------------------------------------------------------
-- Seed data for `experiences`
INSERT INTO `experiences` (`id`, `category_id`, `host_id`, `title`, `subtitle`, `description`, `notice`, `meeting_point`, `city`, `longitude`, `latitude`, `created_at`) VALUES
(1, 1, 1, '羅馬晨間巷弄與咖啡文化散步', '避開人潮，走進羅馬人的早餐日常', '由在地導覽員帶領，從萬神殿附近的小巷出發，認識羅馬老城的街區故事、咖啡吧文化與傳統甜點。途中會停留兩間在地咖啡館，適合第一次到羅馬、想用輕鬆節奏認識城市的人。', '請穿著好走的鞋，費用包含一杯咖啡與一份小點；若有咖啡因限制可提前告知。', 'Piazza della Rotonda 噴泉旁', 'Rome', 12.476872, 41.898610, '2026-07-13 12:05:00'),
(2, 2, 2, '慕尼黑巴伐利亞家常料理課', '學做椒鹽麵包、香腸配菜與蘋果甜點', '在小型料理教室中學習巴伐利亞家庭常見菜色，包含手揉椒鹽麵包、馬鈴薯沙拉與溫熱蘋果甜點。課程最後會一起用餐，主持人也會介紹德國啤酒花與市集採買習慣。', '課程含食材與晚餐；可提供素食版本，需於預訂時備註。', 'Viktualienmarkt 正門入口', 'Munich', 11.576124, 48.135125, '2026-07-13 12:10:00'),
(3, 3, 3, '巴黎奧賽美術館印象派導覽', '用故事看懂莫內、雷諾瓦與梵谷', '藝術史導覽員會用初學者也能理解的方式介紹印象派，從畫家生活、光線觀察到當時巴黎的社會背景。路線精選重點作品，不需要藝術基礎也能跟上。', '門票需自理，建議先線上購票；集合後不等待超過 10 分鐘。', 'Musée d Orsay 主入口外側時鐘下方', 'Paris', 2.326561, 48.860000, '2026-07-13 12:15:00'),
(4, 4, 4, '布拉格伏爾塔瓦河岸黃昏健走', '從查理大橋走到高堡，看城市慢慢亮起來', '沿著伏爾塔瓦河岸步行，經過查理大橋、河岸公園與高堡觀景點。主持人會分享布拉格歷史傳說與拍照角度，適合喜歡散步和城市夜景的旅人。', '全程步行約 5 公里，雨天可能調整路線；請自備飲水。', 'Charles Bridge Old Town Tower 前', 'Prague', 14.411400, 50.086500, '2026-07-13 12:20:00'),
(5, 5, 5, '佛羅倫斯文藝復興建築小旅行', '從聖母百花大教堂讀懂城市權力與美學', '導覽會串聯聖母百花大教堂、領主廣場與老橋周邊，說明文藝復興時期的建築特色、商人家族與藝術贊助制度。內容偏故事化，適合第一次接觸義大利藝術史的人。', '不進入需排隊的室內景點；夏季請準備防曬用品。', 'Cathedral of Santa Maria del Fiore 正門前', 'Florence', 11.255814, 43.769562, '2026-07-13 12:25:00'),
(6, 6, 6, '里奧哈酒莊一日品飲體驗', '參觀葡萄園、橡木桶酒窖與小鎮午餐', '從洛格羅尼奧出發前往里奧哈酒莊，認識葡萄品種、釀造流程與橡木桶熟成。體驗包含三款酒品試飲與在地小菜搭配，適合想了解西班牙葡萄酒的人。', '參加者須年滿 18 歲；請勿自行開車前往集合點後飲酒駕駛。', 'Logroño Train Station 出口大廳', 'Logrono', -2.447700, 42.462700, '2026-07-13 12:30:00'),
(7, 3, 7, '哥本哈根北歐陶杯手作課', '做一只自己的極簡風手捏陶杯', '在溫暖的小型工作室中學習手捏陶基礎，完成一只北歐風陶杯。作品會由工作室代為燒製，完成後可選擇寄送或現場自取。', '燒製約需 3 至 4 週，國際寄送費另計；課程會提供圍裙。', 'Nørreport Station 7-Eleven 門口', 'Copenhagen', 12.568337, 55.676098, '2026-07-13 12:35:00'),
(8, 5, 8, '巴塞隆納佛朗明哥小劇場夜晚', '近距離感受吉他、歌聲與舞步節奏', '由在地樂手帶你進入小型佛朗明哥劇場，演出前會先簡介節奏、拍手與舞者互動方式。演出後可與樂手短聊，了解這項表演文化在西班牙各地的差異。', '票券包含一杯飲品；座位依現場安排，建議準時抵達。', 'Plaça Reial 中央噴泉旁', 'Barcelona', 2.173404, 41.385064, '2026-07-13 12:40:00'),
(9, 5, 9, '倫敦經典街景自然光旅拍', '在西敏寺、泰晤士河畔留下旅行照片', '攝影師會帶領小團在倫敦市中心拍攝自然光人像，路線包含西敏寺外圍、泰晤士河畔與紅色電話亭周邊。適合情侶、朋友或獨旅紀念照。', '體驗含 20 張調色照片電子檔；若遇大雨可改期一次。', 'Westminster Station Exit 4', 'London', -0.127758, 51.507351, '2026-07-13 12:45:00'),
(10, 1, 10, '維也納親子音樂與甜點半日遊', '用孩子也懂的方式認識莫札特與咖啡館', '專為家庭設計的半日體驗，先用互動故事認識維也納音樂文化，再走訪城市公園與傳統咖啡館，品嘗適合親子的甜點組合。步調輕鬆，適合 6 至 12 歲孩子。', '兒童須由成人陪同；費用包含每人一份甜點與飲品。', 'Wien Mitte Station 主要出口', 'Vienna', 16.373819, 48.208174, '2026-07-13 12:50:00');

-- --------------------------------------------------------
-- Seed data for `sessions`
INSERT INTO `sessions` (`id`, `experience_id`, `start_time`, `end_time`, `booking_deadline`, `adult_price`, `child_price`, `min_participants`, `max_participants`, `status`, `created_at`) VALUES
(1, 1, '2026-08-05 08:30:00', '2026-08-05 11:00:00', '2026-08-03 23:59:00', 1850.00, 1200.00, 2, 8, 1, '2026-07-13 13:00:00'),
(2, 2, '2026-08-07 16:00:00', '2026-08-07 20:00:00', '2026-08-05 23:59:00', 3200.00, 2400.00, 2, 10, 1, '2026-07-13 13:00:00'),
(3, 3, '2026-08-09 10:00:00', '2026-08-09 12:30:00', '2026-08-07 23:59:00', 2100.00, 1600.00, 2, 12, 1, '2026-07-13 13:00:00'),
(4, 4, '2026-08-11 17:00:00', '2026-08-11 20:00:00', '2026-08-09 23:59:00', 1700.00, 1100.00, 2, 10, 1, '2026-07-13 13:00:00'),
(5, 5, '2026-08-13 09:30:00', '2026-08-13 12:00:00', '2026-08-11 23:59:00', 1950.00, 1300.00, 2, 12, 1, '2026-07-13 13:00:00'),
(6, 6, '2026-08-15 09:00:00', '2026-08-15 17:00:00', '2026-08-12 23:59:00', 6200.00, 0.00, 2, 8, 1, '2026-07-13 13:00:00'),
(7, 7, '2026-08-17 14:00:00', '2026-08-17 17:00:00', '2026-08-15 23:59:00', 2800.00, 2200.00, 2, 6, 1, '2026-07-13 13:00:00'),
(8, 8, '2026-08-19 19:30:00', '2026-08-19 22:00:00', '2026-08-17 23:59:00', 2600.00, 1800.00, 2, 14, 1, '2026-07-13 13:00:00'),
(9, 9, '2026-08-21 08:00:00', '2026-08-21 10:00:00', '2026-08-19 23:59:00', 4500.00, 4500.00, 1, 4, 1, '2026-07-13 13:00:00'),
(10, 10, '2026-08-23 13:30:00', '2026-08-23 17:00:00', '2026-08-21 23:59:00', 2400.00, 1500.00, 2, 10, 1, '2026-07-13 13:00:00');

-- --------------------------------------------------------
-- Seed data for `posts`
INSERT INTO `posts` (`id`, `title`, `slug`, `content`, `excerpt`, `cover_image`, `content_image`, `status`, `published_at`, `updated_at`, `created_at`, `author_id`, `category_id`) VALUES
(1, '羅馬咖啡散步', 'rome-coffee-walk-guide', '羅馬的早晨適合從一杯站著喝的 espresso 開始。這篇文章整理老城區散步路線、咖啡吧禮儀與適合初訪者的停留點。', '用一杯咖啡開始羅馬老城散步。', '/blog/rome-coffee-cover.jpg', '/blog/rome-coffee-content.jpg', 'published', '2026-07-05 10:00:00', '2026-07-05 10:00:00', '2026-07-01 09:00:00', 1, 1),
(2, '慕尼黑市場料理', 'munich-market-cooking', '從 Viktualienmarkt 認識巴伐利亞飲食文化，了解椒鹽麵包、香腸與馬鈴薯沙拉背後的日常。', '慕尼黑市場與家常料理入門。', '/blog/munich-food-cover.jpg', '/blog/munich-food-content.jpg', 'published', '2026-07-06 10:00:00', '2026-07-06 10:00:00', '2026-07-02 09:00:00', 2, 2),
(3, '巴黎看畫入門', 'paris-orsay-beginner', '第一次到奧賽美術館，不必急著看完所有作品。先抓住印象派的光線、筆觸與生活場景，就能看得更有方向。', '沒有藝術基礎也能看懂奧賽。', '/blog/paris-orsay-cover.jpg', '/blog/paris-orsay-content.jpg', 'published', '2026-07-07 10:00:00', '2026-07-07 10:00:00', '2026-07-03 09:00:00', 3, 3),
(4, '布拉格河岸黃昏', 'prague-river-sunset', '伏爾塔瓦河岸串起布拉格的橋、塔與城堡景色。黃昏時段光線柔和，很適合慢慢散步與拍照。', '布拉格黃昏散步路線。', '/blog/prague-river-cover.jpg', '/blog/prague-river-content.jpg', 'published', '2026-07-08 10:00:00', '2026-07-08 10:00:00', '2026-07-04 09:00:00', 4, 4),
(5, '佛羅倫斯建築', 'florence-renaissance-route', '佛羅倫斯的街道像一本文藝復興入門書，從大教堂、廣場到老橋，都能看見商業、信仰與藝術的交會。', '用建築讀懂佛羅倫斯。', '/blog/florence-cover.jpg', '/blog/florence-content.jpg', 'published', '2026-07-09 10:00:00', '2026-07-09 10:00:00', '2026-07-05 09:00:00', 5, 5),
(6, '里奧哈酒莊', 'rioja-winery-basics', '里奧哈是西班牙重要葡萄酒產區，認識葡萄品種、橡木桶熟成與餐酒搭配，會讓品飲更有層次。', '西班牙酒莊體驗入門。', '/blog/rioja-cover.jpg', '/blog/rioja-content.jpg', 'published', '2026-07-10 10:00:00', '2026-07-10 10:00:00', '2026-07-06 09:00:00', 6, 6),
(7, '北歐陶藝手作', 'copenhagen-ceramic-workshop', '哥本哈根的手作工作室常見簡潔線條與溫潤材質，適合旅途中安排一段慢下來的創作時間。', '在哥本哈根做一只陶杯。', '/blog/copenhagen-ceramic-cover.jpg', '/blog/copenhagen-ceramic-content.jpg', 'published', '2026-07-11 10:00:00', '2026-07-11 10:00:00', '2026-07-07 09:00:00', 7, 7),
(8, '佛朗明哥夜晚', 'barcelona-flamenco-night', '佛朗明哥不只是舞蹈，也包含歌唱、吉他與即興節奏。小劇場能讓觀眾更近距離感受表演能量。', '巴塞隆納小劇場體驗。', '/blog/barcelona-flamenco-cover.jpg', '/blog/barcelona-flamenco-content.jpg', 'published', '2026-07-12 10:00:00', '2026-07-12 10:00:00', '2026-07-08 09:00:00', 8, 8),
(9, '倫敦旅拍地點', 'london-photo-spots', '西敏寺、泰晤士河畔與紅色電話亭都是倫敦經典畫面。掌握光線與動線，可以拍出更自然的旅行照片。', '倫敦自然光旅拍路線。', '/blog/london-photo-cover.jpg', '/blog/london-photo-content.jpg', 'published', '2026-07-13 10:00:00', '2026-07-13 10:00:00', '2026-07-09 09:00:00', 9, 9),
(10, '維也納親子旅行', 'vienna-family-music-dessert', '維也納很適合親子用輕鬆方式接觸音樂文化，再搭配公園與咖啡館，讓孩子也能享受城市旅行。', '孩子也能喜歡的維也納路線。', '/blog/vienna-family-cover.jpg', '/blog/vienna-family-content.jpg', 'published', '2026-07-14 10:00:00', '2026-07-14 10:00:00', '2026-07-10 09:00:00', 10, 10);

-- --------------------------------------------------------
-- Seed data for `experience_images`
INSERT INTO `experience_images` (`id`, `experience_id`, `image_url`, `is_primary`, `sort_order`, `created_at`) VALUES
(1, 1, '/images/experiences/rome-coffee-walk-2.jpg', 1, 1, '2026-07-13 13:05:00'),
(2, 2, '/images/experiences/munich-cooking-class.jpg', 1, 1, '2026-07-13 13:05:00'),
(3, 3, '/images/experiences/paris-orsay-tour.jpg', 1, 1, '2026-07-13 13:05:00'),
(4, 4, '/images/experiences/prague-river-walk.jpg', 1, 1, '2026-07-13 13:05:00'),
(5, 5, '/images/experiences/florence-renaissance.jpg', 1, 1, '2026-07-13 13:05:00'),
(6, 6, '/images/experiences/rioja-winery.jpg', 1, 1, '2026-07-13 13:05:00'),
(7, 7, '/images/experiences/copenhagen-ceramic.jpg', 1, 1, '2026-07-13 13:05:00'),
(8, 8, '/images/experiences/barcelona-flamenco.jpg', 1, 1, '2026-07-13 13:05:00'),
(9, 9, '/images/experiences/london-photo-shoot.jpg', 1, 1, '2026-07-13 13:05:00'),
(10, 10, '/images/experiences/vienna-family-music.jpg', 1, 1, '2026-07-13 13:05:00');

-- --------------------------------------------------------
-- Seed data for `order_main`
INSERT INTO `order_main` (`id`, `member_id`, `contact_name`, `contact_phone`, `contact_email`, `payment_method`, `order_status`, `original_amount`, `coupon_id`, `coupon_discount`, `points_redeemed`, `final_amount`, `points_earned`, `created_at`, `updated_at`) VALUES
('EU2607130001', 1, '王小明', '0912000001', 'ming.wang@example.com', 'credit_card', 'paid', 3700.00, 1, 300.00, 0, 3400.00, 34, '2026-07-13 14:00:00', '2026-07-13 14:02:00'),
('EU2607130002', 2, '李雅婷', '0912000002', 'yating.lee@example.com', 'line_pay', 'paid', 6400.00, 2, 600.00, 100, 5700.00, 57, '2026-07-13 14:05:00', '2026-07-13 14:07:00'),
('EU2607130003', 3, '陳柏宇', '0912000003', 'boyu.chen@example.com', 'credit_card', 'paid', 4200.00, 8, 350.00, 0, 3850.00, 38, '2026-07-13 14:10:00', '2026-07-13 14:12:00'),
('EU2607130004', 4, '林思涵', '0912000004', 'sihan.lin@example.com', 'bank_transfer', 'pending', 3400.00, 9, 200.00, 0, 3200.00, 0, '2026-07-13 14:15:00', '2026-07-13 14:15:00'),
('EU2607130005', 5, '張育誠', '0912000005', 'yucheng.chang@example.com', 'credit_card', 'paid', 3900.00, 8, 350.00, 50, 3500.00, 35, '2026-07-13 14:20:00', '2026-07-13 14:22:00'),
('EU2607130006', 6, '黃品萱', '0912000006', 'pinxuan.huang@example.com', 'credit_card', 'paid', 12400.00, 10, 1500.00, 300, 10600.00, 106, '2026-07-13 14:25:00', '2026-07-13 14:27:00'),
('EU2607130007', 7, '吳承恩', '0912000007', 'chengen.wu@example.com', 'line_pay', 'paid', 5600.00, 3, 1000.00, 0, 4600.00, 46, '2026-07-13 14:30:00', '2026-07-13 14:31:00'),
('EU2607130008', 8, '蔡佳穎', '0912000008', 'jiaying.tsai@example.com', 'credit_card', 'cancelled', 5200.00, 4, 250.00, 0, 4950.00, 0, '2026-07-13 14:35:00', '2026-07-13 15:00:00'),
('EU2607130009', 9, '許哲維', '0912000009', 'zhewei.hsu@example.com', 'credit_card', 'paid', 4500.00, 7, 900.00, 100, 3500.00, 35, '2026-07-13 14:40:00', '2026-07-13 14:42:00'),
('EU2607130010', 10, '鄭若晴', '0912000010', 'ruoqing.cheng@example.com', 'line_pay', 'paid', 4800.00, 6, 450.00, 0, 4350.00, 43, '2026-07-13 14:45:00', '2026-07-13 14:47:00');

-- --------------------------------------------------------
-- Seed data for `order_items`
INSERT INTO `order_items` (`id`, `order_id`, `experience_id`, `session_id`, `original_unit_price`, `quantity`, `subtotal`, `item_status`, `special_request`, `updated_at`) VALUES
(1, 'EU2607130001', 1, 1, 1850.00, 2, 3700.00, 'confirmed', '希望安排中文或英文說明。', '2026-07-13 14:02:00'),
(2, 'EU2607130002', 2, 2, 3200.00, 2, 6400.00, 'confirmed', '其中一位不吃牛肉。', '2026-07-13 14:07:00'),
(3, 'EU2607130003', 3, 3, 2100.00, 2, 4200.00, 'confirmed', '想多了解梵谷作品。', '2026-07-13 14:12:00'),
(4, 'EU2607130004', 4, 4, 1700.00, 2, 3400.00, 'pending', '希望走慢一點拍照。', '2026-07-13 14:15:00'),
(5, 'EU2607130005', 5, 5, 1950.00, 2, 3900.00, 'confirmed', NULL, '2026-07-13 14:22:00'),
(6, 'EU2607130006', 6, 6, 6200.00, 2, 12400.00, 'confirmed', '可接受紅酒，想了解餐酒搭配。', '2026-07-13 14:27:00'),
(7, 'EU2607130007', 7, 7, 2800.00, 2, 5600.00, 'confirmed', '作品完成後請協助寄回台灣。', '2026-07-13 14:31:00'),
(8, 'EU2607130008', 8, 8, 2600.00, 2, 5200.00, 'cancelled', '臨時更改行程。', '2026-07-13 15:00:00'),
(9, 'EU2607130009', 9, 9, 4500.00, 1, 4500.00, 'confirmed', '想拍攝一人旅行照。', '2026-07-13 14:42:00'),
(10, 'EU2607130010', 10, 10, 2400.00, 2, 4800.00, 'confirmed', '同行小孩 8 歲。', '2026-07-13 14:47:00');

-- --------------------------------------------------------
-- Seed data for `member_coupons`
INSERT INTO `member_coupons` (`id`, `member_id`, `coupon_id`, `is_used`, `received_at`, `used_at`) VALUES
(1, 1, 1, 1, '2026-07-01 09:00:00', '2026-07-13 14:00:00'),
(2, 2, 2, 1, '2026-07-01 09:05:00', '2026-07-13 14:05:00'),
(3, 3, 8, 1, '2026-07-01 09:10:00', '2026-07-13 14:10:00'),
(4, 4, 9, 1, '2026-07-01 09:15:00', '2026-07-13 14:15:00'),
(5, 5, 8, 1, '2026-07-01 09:20:00', '2026-07-13 14:20:00'),
(6, 6, 10, 1, '2026-07-01 09:25:00', '2026-07-13 14:25:00'),
(7, 7, 3, 1, '2026-07-01 09:30:00', '2026-07-13 14:30:00'),
(8, 8, 4, 1, '2026-07-01 09:35:00', '2026-07-13 14:35:00'),
(9, 9, 7, 1, '2026-07-01 09:40:00', '2026-07-13 14:40:00'),
(10, 10, 6, 1, '2026-07-01 09:45:00', '2026-07-13 14:45:00');

-- --------------------------------------------------------
-- Seed data for `favorites`
INSERT INTO `favorites` (`id`, `experience_id`, `member_id`, `created_at`) VALUES
(1, 1, 2, '2026-07-13 15:10:00'),
(2, 2, 3, '2026-07-13 15:11:00'),
(3, 3, 4, '2026-07-13 15:12:00'),
(4, 4, 5, '2026-07-13 15:13:00'),
(5, 5, 6, '2026-07-13 15:14:00'),
(6, 6, 7, '2026-07-13 15:15:00'),
(7, 7, 8, '2026-07-13 15:16:00'),
(8, 8, 9, '2026-07-13 15:17:00'),
(9, 9, 10, '2026-07-13 15:18:00'),
(10, 10, 1, '2026-07-13 15:19:00');

-- --------------------------------------------------------
-- Seed data for `cart`
INSERT INTO `cart` (`id`, `member_id`, `experience_id`, `session_id`, `quantity`) VALUES
(1, 1, 2, 2, 2),
(2, 2, 3, 3, 1),
(3, 3, 4, 4, 2),
(4, 4, 5, 5, 1),
(5, 5, 6, 6, 2),
(6, 6, 7, 7, 1),
(7, 7, 8, 8, 2),
(8, 8, 9, 9, 1),
(9, 9, 10, 10, 3),
(10, 10, 1, 1, 2);

-- --------------------------------------------------------
-- Seed data for `experience_reviews`
INSERT INTO `experience_reviews` (`id`, `order_item_id`, `experience_id`, `member_id`, `rating`, `comment`, `created_at`, `image_url`) VALUES
(1, 1, 1, 1, 5, '早晨的羅馬很舒服，主持人講解清楚，咖啡店也很在地。', '2026-08-06 20:10:00', '/reviews/rome-coffee-review-01.jpg'),
(2, 2, 2, 2, 5, '料理課很有參與感，最後一起吃飯的氣氛很好。', '2026-08-08 21:30:00', '/reviews/munich-cooking-review-01.jpg'),
(3, 3, 3, 3, 5, '原本看畫很吃力，導覽後比較知道要看什麼細節。', '2026-08-10 18:45:00', NULL),
(4, 4, 4, 4, 4, '河岸路線很美，黃昏拍照效果很好，只是走路距離稍長。', '2026-08-12 22:00:00', '/reviews/prague-walk-review-01.jpg'),
(5, 5, 5, 5, 5, '用故事理解佛羅倫斯，比自己查資料有趣很多。', '2026-08-14 19:20:00', NULL),
(6, 6, 6, 6, 5, '酒莊安排專業，試飲份量剛好，午餐也好吃。', '2026-08-16 20:40:00', '/reviews/rioja-review-01.jpg'),
(7, 7, 7, 7, 4, '老師很有耐心，第一次做陶杯也能完成，期待收到作品。', '2026-08-18 18:10:00', '/reviews/copenhagen-ceramic-review-01.jpg'),
(8, 8, 8, 8, 4, '演出距離很近，很震撼，可惜臨時取消沒有實際參加。', '2026-08-20 12:00:00', NULL),
(9, 9, 9, 9, 5, '攝影師很會引導姿勢，照片自然不尷尬。', '2026-08-22 17:50:00', '/reviews/london-photo-review-01.jpg'),
(10, 10, 10, 10, 5, '孩子聽得懂也玩得開心，甜點店選得很棒。', '2026-08-24 20:25:00', '/reviews/vienna-family-review-01.jpg');

-- Seed data for `category_notes`
INSERT INTO category_notes (category_id, title, content, sort_order) VALUES
(1, '參加條件', '建議年滿 12 歲；未滿 18 歲需由成人陪同。', 1),
(1, '行走強度', '全程需步行一段距離，建議穿著舒適好走的鞋。', 2),
(1, '集合提醒', '請於體驗開始前 10 分鐘抵達集合地點。', 3),
(1, '取消政策', '體驗開始前 24 小時可免費取消，逾期取消恕不退款。', 4),

(2, '參加條件', '適合對藝術、歷史與城市文化有興趣的旅人參加。', 1),
(2, '入場規範', '部分展館可能需配合安檢、寄物或禁止飲食規定。', 2),
(2, '門票說明', '若行程包含門票，將於體驗頁面或現場說明。', 3),
(2, '取消政策', '體驗開始前 24 小時可免費取消，逾期取消恕不退款。', 4),

(3, '飲食限制', '如有素食、過敏或特殊飲食需求，請提前告知。', 1),
(3, '過敏提醒', '餐點可能含堅果、乳製品、麩質或海鮮等過敏原。', 2),
(3, '費用包含', '費用包含指定餐點或飲品，其他加點需自行負擔。', 3),
(3, '取消政策', '體驗開始前 24 小時可免費取消，逾期取消恕不退款。', 4),

(4, '參加條件', '建議具備基本體力，並依行程需求穿著合適服裝。', 1),
(4, '天候安排', '小雨照常進行；遇惡劣天候將協助改期或全額退款。', 2),
(4, '行走強度', '行程可能包含較長步行或戶外活動，請評估自身狀況。', 3),
(4, '取消政策', '體驗開始前 24 小時可免費取消，逾期取消恕不退款。', 4),

(5, '拍攝提醒', '建議穿著喜歡且方便活動的服裝，並準時抵達拍攝地點。', 1),
(5, '天候安排', '戶外拍攝遇惡劣天候時，將協助改期或調整拍攝地點。', 2),
(5, '照片交付', '照片將於體驗結束後依約定時間提供電子檔。', 3),
(5, '取消政策', '體驗開始前 24 小時可免費取消，逾期取消恕不退款。', 4),

(6, '年齡限制', '部分夜生活體驗可能需年滿當地法定年齡。', 1),
(6, '集合提醒', '請準時抵達集合地點，夜間行程建議結伴同行。', 2),
(6, '飲酒提醒', '請理性飲酒，並自行評估身體狀況。', 3),
(6, '取消政策', '體驗開始前 24 小時可免費取消，逾期取消恕不退款。', 4);

-- 我新增 004_update_sessions_booking_deadline.sql 用途：統一 sessions 報名截止時間為 start_time 前 24 小時

UPDATE sessions
SET booking_deadline = DATE_SUB(start_time, INTERVAL 24 HOUR)
WHERE status = 1;

COMMIT;
