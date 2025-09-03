-- Manual SQL initialization for s82_fivebot database
-- Run this in phpMyAdmin if the automated scripts fail

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(191) NOT NULL,
  `discord_id` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `avatar` VARCHAR(191) NULL,
  `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  `credits` INTEGER NOT NULL DEFAULT 100,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_discord_id_key` (`discord_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create hosts table  
CREATE TABLE IF NOT EXISTS `hosts` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `url` VARCHAR(191) NOT NULL,
  `max_bots` INTEGER NOT NULL DEFAULT 10,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `hosts_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create bots table
CREATE TABLE IF NOT EXISTS `bots` (
  `id` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `token_encrypted` TEXT NOT NULL,
  `client_id` VARCHAR(191) NULL,
  `prefix` VARCHAR(191) NOT NULL DEFAULT '!',
  `is_active` BOOLEAN NOT NULL DEFAULT false,
  `container_id` VARCHAR(191) NULL,
  `instance_id` VARCHAR(191) NULL,
  `status` ENUM('OFFLINE', 'STARTING', 'ONLINE', 'STOPPING', 'RESTARTING', 'ERROR') NOT NULL DEFAULT 'OFFLINE',
  `should_auto_restart` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  INDEX `bots_owner_id_fkey` (`owner_id`),
  CONSTRAINT `bots_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create bot_configs table
CREATE TABLE IF NOT EXISTS `bot_configs` (
  `id` VARCHAR(191) NOT NULL,
  `bot_id` VARCHAR(191) NOT NULL,
  `welcome_enabled` BOOLEAN NOT NULL DEFAULT false,
  `welcome_channel_id` VARCHAR(191) NULL,
  `welcome_embed_json` JSON NULL,
  `welcome_logo_url` VARCHAR(191) NULL,
  `welcome_thumbnail_url` VARCHAR(191) NULL,
  `moderation_enabled` BOOLEAN NOT NULL DEFAULT false,
  `auto_role_enabled` BOOLEAN NOT NULL DEFAULT false,
  `auto_role_id` VARCHAR(191) NULL,
  `logging_channel_id` VARCHAR(191) NULL,
  `custom_commands` LONGTEXT NULL,
  `ticket_data` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `bot_configs_bot_id_key` (`bot_id`),
  CONSTRAINT `bot_configs_bot_id_fkey` FOREIGN KEY (`bot_id`) REFERENCES `bots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create bot_commands table
CREATE TABLE IF NOT EXISTS `bot_commands` (
  `id` VARCHAR(191) NOT NULL,
  `bot_id` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `data` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `error` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processed_at` DATETIME(3) NULL,
  
  PRIMARY KEY (`id`),
  INDEX `bot_commands_bot_id_status_index` (`bot_id`, `status`),
  CONSTRAINT `bot_commands_bot_id_fkey` FOREIGN KEY (`bot_id`) REFERENCES `bots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert admin user
INSERT INTO `users` (`id`, `discord_id`, `username`, `role`, `credits`) 
VALUES (UUID(), '382532538599055371', 'teamrocket', 'ADMIN', 1000);

-- Insert default host
INSERT INTO `hosts` (`id`, `name`, `url`, `max_bots`, `is_active`) 
VALUES (UUID(), 'localhost', 'http://localhost', 10, true);