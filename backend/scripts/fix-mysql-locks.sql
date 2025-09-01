-- Script to fix MySQL lock timeout issues for FiveBot

-- 1. Show current lock wait timeout
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';

-- 2. Show current connections and max connections
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Threads_connected';

-- 3. Check for current locks
SELECT 
    waiting_trx_id,
    waiting_pid,
    waiting_query,
    blocking_trx_id,
    blocking_pid,
    blocking_query
FROM sys.innodb_lock_waits;

-- 4. Show long-running queries
SELECT 
    id,
    user,
    host,
    db,
    command,
    time,
    state,
    info
FROM information_schema.processlist
WHERE time > 5
ORDER BY time DESC;

-- 5. Kill specific blocking query (replace XXX with the process ID)
-- KILL XXX;

-- 6. Increase lock wait timeout (requires SUPER privilege)
-- SET GLOBAL innodb_lock_wait_timeout = 120;

-- 7. Check InnoDB status for deadlocks
SHOW ENGINE INNODB STATUS;

-- 8. Find tables with most locks
SELECT 
    object_schema,
    object_name,
    count_star as locks_count
FROM performance_schema.table_lock_waits_summary_by_table
WHERE object_schema = 's82_fivebotmariadb'
ORDER BY count_star DESC
LIMIT 10;

-- 9. Optimize bot table to reduce fragmentation
-- OPTIMIZE TABLE s82_fivebotmariadb.bots;

-- 10. Show current transaction isolation level
SELECT @@transaction_isolation;

-- 11. Recommended settings for high-concurrency bot management:
-- Add these to your MySQL/MariaDB configuration file (my.cnf/my.ini):
/*
[mysqld]
innodb_lock_wait_timeout = 120
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_thread_concurrency = 0
innodb_read_io_threads = 8
innodb_write_io_threads = 8
transaction-isolation = READ-COMMITTED
*/

-- 12. Create index for better performance on bot status updates
-- ALTER TABLE s82_fivebotmariadb.bots ADD INDEX idx_status_updated (status, updated_at);
-- ALTER TABLE s82_fivebotmariadb.bots ADD INDEX idx_container_status (container_id, status);