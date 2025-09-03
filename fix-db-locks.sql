-- Check for active locks
SELECT * FROM information_schema.INNODB_LOCKS;

-- Check for waiting transactions
SELECT * FROM information_schema.INNODB_LOCK_WAITS;

-- Show current processes
SHOW FULL PROCESSLIST;

-- Kill any long-running queries (replace ID with actual process ID if needed)
-- KILL [process_id];

-- Show InnoDB status
SHOW ENGINE INNODB STATUS;

-- Reset bot status to OFFLINE to clear any locks
UPDATE bots SET status = 'OFFLINE' WHERE id = '9b2be1f9-a3d0-43be-b350-a673b9d309c9';

-- Commit any pending transactions
COMMIT;