SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS `memberhub`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `memberhub`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `promotions`;
DROP TABLE IF EXISTS `membership_cards`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `shops`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(160) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` CHAR(128) NOT NULL,
  `password_salt` CHAR(32) NOT NULL,
  `role` ENUM('admin', 'owner', 'customer') NOT NULL,
  `status` ENUM('active', 'locked') NOT NULL DEFAULT 'active',
  `phone` VARCHAR(40) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shops` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(180) NOT NULL,
  `slug` VARCHAR(190) NULL,
  `address` VARCHAR(255) NULL,
  `phone` VARCHAR(40) NULL,
  `email` VARCHAR(190) NULL,
  `logo_data_url` MEDIUMTEXT NULL,
  `description` TEXT NULL,
  `owner_id` INT UNSIGNED NULL,
  `status` ENUM('active', 'locked') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shops_slug` (`slug`),
  KEY `idx_shops_owner` (`owner_id`),
  KEY `idx_shops_status` (`status`),
  CONSTRAINT `fk_shops_owner`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NULL,
  `shop_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `slug` VARCHAR(190) NULL,
  `email` VARCHAR(190) NULL,
  `phone` VARCHAR(40) NULL,
  `birthday` DATE NULL,
  `address` VARCHAR(255) NULL,
  `status` ENUM('active', 'locked') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_shop_slug` (`shop_id`, `slug`),
  UNIQUE KEY `uq_customers_shop_user` (`shop_id`, `user_id`),
  KEY `idx_customers_user` (`user_id`),
  KEY `idx_customers_shop` (`shop_id`),
  KEY `idx_customers_email` (`email`),
  KEY `idx_customers_shop_birthday` (`shop_id`, `birthday`),
  CONSTRAINT `fk_customers_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_customers_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `services` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `price` INT UNSIGNED NOT NULL DEFAULT 0,
  `duration_minutes` INT UNSIGNED NOT NULL DEFAULT 30,
  `description` TEXT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_services_shop` (`shop_id`),
  KEY `idx_services_status` (`status`),
  CONSTRAINT `fk_services_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `membership_cards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT UNSIGNED NOT NULL,
  `shop_id` INT UNSIGNED NOT NULL,
  `card_number` VARCHAR(40) NOT NULL,
  `points` INT NOT NULL DEFAULT 0,
  `tier` ENUM('Silver', 'Gold', 'Platinum', 'Diamond') NOT NULL DEFAULT 'Silver',
  `issued_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATE NULL,
  `status` ENUM('active', 'locked', 'expired') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cards_number` (`card_number`),
  KEY `idx_cards_customer` (`customer_id`),
  KEY `idx_cards_shop` (`shop_id`),
  KEY `idx_cards_shop_customer` (`shop_id`, `customer_id`),
  CONSTRAINT `fk_cards_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_cards_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT UNSIGNED NOT NULL,
  `shop_id` INT UNSIGNED NOT NULL,
  `service_id` INT UNSIGNED NULL,
  `amount` INT UNSIGNED NOT NULL DEFAULT 0,
  `points_delta` INT NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transactions_customer` (`customer_id`),
  KEY `idx_transactions_shop` (`shop_id`),
  KEY `idx_transactions_service` (`service_id`),
  KEY `idx_transactions_created_at` (`created_at`),
  KEY `idx_transactions_shop_created` (`shop_id`, `created_at`),
  CONSTRAINT `fk_transactions_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_service`
    FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `promotions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `discount_percent` INT UNSIGNED NOT NULL DEFAULT 0,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_promotions_shop` (`shop_id`),
  KEY `idx_promotions_status` (`status`),
  KEY `idx_promotions_shop_status_dates` (`shop_id`, `status`, `start_date`, `end_date`),
  CONSTRAINT `fk_promotions_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users`
  (`id`, `name`, `email`, `password_hash`, `password_salt`, `role`, `status`, `phone`)
VALUES
  (1, 'System Admin', 'admin@example.com', '47ebf38d3bca1cd96f3501338d5744c6c19334d96154eb4b1569735325ee40fb53433df9eeb563496ea58c3d970604782945a3b5ea070e3d6ed69d022f8c85d6', 'd11a7099aa9fe23b3c06e70f73ab9e23', 'admin', 'active', '0900000001'),
  (2, 'Chu Lumi Spa', 'owner@example.com', '3cc7276fbf9477c0fcd2422b5646c949d32a06c58573bfc9088882415713f70e7392c8b52b64aaf7d006c9bd812bb8744278a850fb895902270b5ba676635485', '70f02a18bb94d41bc3ddc3cdce722a66', 'owner', 'active', '0900000002'),
  (3, 'Nguyen Minh Anh', 'customer@example.com', '52bad10d0f8e56985c939dca77ed14c6b6e634033956a95dd13f99cd5ecbb0461b1fbe429b43ca6d1f21dc68d50fbae21d411c186a3f080e60e843c63ccfe134', '1154c7ebbfc6300abe2cd72cbbb0e8d2', 'customer', 'active', '0900000003');

INSERT INTO `shops`
  (`id`, `name`, `slug`, `address`, `phone`, `email`, `description`, `owner_id`, `status`)
VALUES
  (1, 'Lumi Spa Quan 1', 'LumiSpaQuan1', '12 Nguyen Hue, Quan 1, TP.HCM', '028 1111 2222', 'hello@lumispa.vn', 'Cham soc da, massage thu gian va goi thanh vien theo diem.', 2, 'active'),
  (2, 'Nova Fitness Thu Duc', 'NovaFitnessThuDuc', '88 Vo Van Ngan, TP. Thu Duc', '028 3333 4444', 'team@novafit.vn', 'Phong tap va dich vu huan luyen ca nhan.', NULL, 'active');

INSERT INTO `customers`
  (`id`, `user_id`, `shop_id`, `name`, `slug`, `email`, `phone`, `birthday`, `address`, `status`)
VALUES
  (1, 3, 1, 'Nguyen Minh Anh', 'NguyenMinhAnh', 'customer@example.com', '0900000003', '1996-05-14', 'Quan Binh Thanh, TP.HCM', 'active'),
  (2, NULL, 1, 'Tran Quoc Bao', 'TranQuocBao', 'bao.tran@example.com', '0900000004', '1992-09-20', 'Quan 3, TP.HCM', 'active');

INSERT INTO `services`
  (`id`, `shop_id`, `name`, `price`, `duration_minutes`, `description`, `status`)
VALUES
  (1, 1, 'Cham soc da co ban', 450000, 60, 'Lam sach sau, mat na va massage mat.', 'active'),
  (2, 1, 'Massage da nong', 650000, 75, 'Lieu trinh thu gian toan than.', 'active'),
  (3, 2, 'Goi PT 1:1', 900000, 60, 'Tap luyen ca nhan hoa theo muc tieu.', 'active');

INSERT INTO `membership_cards`
  (`id`, `customer_id`, `shop_id`, `card_number`, `points`, `tier`, `expires_at`, `status`)
VALUES
  (1, 1, 1, 'MC001IMPORT001', 720, 'Gold', '2027-12-31', 'active'),
  (2, 2, 1, 'MC001IMPORT002', 120, 'Silver', '2027-12-31', 'active');

INSERT INTO `transactions`
  (`id`, `customer_id`, `shop_id`, `service_id`, `amount`, `points_delta`, `note`, `created_at`)
VALUES
  (1, 1, 1, 1, 450000, 45, 'Tich diem tu dich vu cham soc da.', DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (2, 1, 1, 2, 650000, 65, 'Khach hang su dung goi premium.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (3, 2, 1, 1, 450000, 45, 'Khach moi.', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO `promotions`
  (`id`, `shop_id`, `title`, `description`, `discount_percent`, `start_date`, `end_date`, `status`)
VALUES
  (1, 1, 'Uu dai hoi vien Gold', 'Giam gia cho khach hang hang Gold tro len.', 15, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY), 'active'),
  (2, 2, 'Thang tap thu dau tien', 'Uu dai cho khach hang dang ky moi.', 10, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'active');

ALTER TABLE `users` AUTO_INCREMENT = 4;
ALTER TABLE `shops` AUTO_INCREMENT = 3;
ALTER TABLE `customers` AUTO_INCREMENT = 3;
ALTER TABLE `services` AUTO_INCREMENT = 4;
ALTER TABLE `membership_cards` AUTO_INCREMENT = 3;
ALTER TABLE `transactions` AUTO_INCREMENT = 4;
ALTER TABLE `promotions` AUTO_INCREMENT = 3;
