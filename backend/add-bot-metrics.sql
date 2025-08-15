-- Add bot metrics table
CREATE TABLE bot_metrics (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  commands_used INT NOT NULL DEFAULT 0,
  messages_processed INT NOT NULL DEFAULT 0,
  guilds_count INT NOT NULL DEFAULT 0,
  users_count INT NOT NULL DEFAULT 0,
  uptime_seconds INT NOT NULL DEFAULT 0,
  avg_response_time_ms INT NOT NULL DEFAULT 0,
  errors_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bot_date (bot_id, date),
  INDEX idx_bot_metrics_bot_id (bot_id),
  INDEX idx_bot_metrics_date (date)
);