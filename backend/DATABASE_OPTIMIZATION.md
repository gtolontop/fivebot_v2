# Database Connection Optimization Guide

## Overview
This document describes the database connection pool configuration and optimization strategies implemented to prevent lock timeouts and improve performance.

## Connection Pool Configuration

### Prisma Client Configuration
The Prisma client has been configured with the following connection pool settings:

```typescript
// src/common/prisma/prisma.service.ts
datasources: {
  db: {
    url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=30',
  },
}
```

**Parameters:**
- `connection_limit=20`: Maximum number of connections in the pool
- `pool_timeout=30`: Maximum time (in seconds) to wait for a connection from the pool

### Default Values
- **Connection Limit**: If not specified, defaults to `num_physical_cpus * 2 + 1`
- **Pool Timeout**: Default is 10 seconds

## Retry Mechanism

A retry mechanism has been implemented in the `PrismaService` to handle lock timeouts and deadlocks:

```typescript
async executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    operationName?: string;
  } = {},
): Promise<T>
```

**Features:**
- Automatic retry on lock timeout errors
- Exponential backoff with jitter
- Configurable retry attempts and delays
- Handles both Prisma and MySQL error codes

## MySQL Server Configuration

### Recommended Settings
For optimal performance, ensure your MySQL server has these settings:

```sql
-- Check current settings
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';  -- Recommended: 50s or higher
SHOW VARIABLES LIKE 'max_connections';           -- Recommended: 200 or higher
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';   -- Recommended: 70-80% of available RAM
```

### Monitoring Scripts

Two utility scripts are provided for database monitoring:

1. **Check MySQL Configuration** (`scripts/check-mysql-config.js`)
   - Displays current MySQL configuration
   - Shows active connections and locks
   - Provides optimization recommendations

2. **Monitor Database Performance** (`scripts/monitor-db-performance.js`)
   - Real-time monitoring of slow queries
   - Connection count tracking
   - Lock wait detection
   - Deadlock monitoring

## Usage Examples

### Using the Retry Mechanism

```typescript
// In your service
constructor(private prisma: PrismaService) {}

async updateBot(botId: string, data: any) {
  return this.prisma.executeWithRetry(
    () => this.prisma.bot.update({
      where: { id: botId },
      data,
    }),
    {
      operationName: 'updateBot',
      maxRetries: 5,
      baseDelay: 200,
    }
  );
}
```

### Running Monitoring Scripts

```bash
# Check MySQL configuration
cd backend
node scripts/check-mysql-config.js

# Monitor performance (runs continuously)
node scripts/monitor-db-performance.js
```

## Transaction Configuration

All database transactions have been configured with the following settings to prevent timeout issues:

```typescript
{
  maxWait: 10000,              // Maximum time to wait for a transaction slot (10 seconds)
  timeout: 60000,              // Maximum time for the transaction to complete (60 seconds)
  isolationLevel: 'ReadCommitted', // Use less strict isolation to reduce locks
}
```

**Note**: Different services may have different timeout values based on their needs:
- Bot status updates: 60 seconds (complex operations with multiple queries)
- Credit operations: 30 seconds (simpler operations)
- General operations: 30-60 seconds depending on complexity

## Best Practices

1. **Use Transactions Wisely**
   - Keep transactions as short as possible
   - Use appropriate isolation levels (ReadCommitted recommended)
   - Always configure timeout for long-running transactions
   - Use the retry mechanism for critical operations

2. **Optimize Queries**
   - Use proper indexes
   - Avoid SELECT * queries
   - Use pagination for large result sets

3. **Connection Management**
   - Don't create multiple PrismaClient instances
   - Use the singleton pattern (already implemented)
   - Close connections properly in serverless environments

4. **Error Handling**
   - Always catch and handle database errors
   - Log errors for debugging
   - Provide meaningful error messages to users

## Troubleshooting

### Common Issues

1. **"Lock wait timeout exceeded"**
   - Increase `innodb_lock_wait_timeout` on MySQL server
   - Use the retry mechanism
   - Check for long-running transactions

2. **"Too many connections"**
   - Increase `max_connections` on MySQL server
   - Reduce `connection_limit` in Prisma
   - Check for connection leaks

3. **Deadlocks**
   - Access tables in consistent order
   - Keep transactions short
   - Use appropriate isolation levels

### Debug Commands

```sql
-- Show current connections
SHOW PROCESSLIST;

-- Show InnoDB status (includes deadlock info)
SHOW ENGINE INNODB STATUS;

-- Check for lock waits
SELECT * FROM information_schema.innodb_lock_waits;

-- Kill a blocking query
KILL <process_id>;
```

## Environment Variables

Ensure your `.env` file includes proper database configuration:

```env
DATABASE_URL="mysql://user:password@host:port/database"
```

The connection pool parameters are automatically appended by the Prisma service.