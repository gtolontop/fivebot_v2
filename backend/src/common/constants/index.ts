/**
 * Application-wide constants
 */

// ===========================================
// TIMING & INTERVALS
// ===========================================

/** Heartbeat interval for bot health checks (ms) */
export const BOT_HEARTBEAT_INTERVAL = 30000; // 30 seconds

/** Timeout before considering a bot as unresponsive (ms) */
export const BOT_HEARTBEAT_TIMEOUT = 10000; // 10 seconds

/** Delay before marking bot as online after startup (ms) */
export const BOT_STARTUP_DELAY = 5000; // 5 seconds

/** Timeout for graceful bot shutdown (ms) */
export const BOT_SHUTDOWN_TIMEOUT = 5000; // 5 seconds

/** Force kill timeout after graceful shutdown fails (ms) */
export const BOT_FORCE_KILL_TIMEOUT = 8000; // 8 seconds

/** Retry delay base for database operations (ms) */
export const DB_RETRY_BASE_DELAY = 200;

/** Maximum retry attempts for database operations */
export const DB_MAX_RETRIES = 5;

/** Redis job polling interval (ms) */
export const REDIS_JOB_POLL_INTERVAL = 1000; // 1 second

/** Lock acquisition timeout (ms) */
export const DISTRIBUTED_LOCK_TIMEOUT = 30000; // 30 seconds

// ===========================================
// CACHE TTL
// ===========================================

/** Default cache TTL (seconds) */
export const CACHE_DEFAULT_TTL = 3600; // 1 hour

/** URL metadata cache TTL (ms) */
export const URL_METADATA_CACHE_TTL = 3600000; // 1 hour

/** Bot metrics cache TTL (seconds) */
export const BOT_METRICS_CACHE_TTL = 300; // 5 minutes

/** User session cache TTL (seconds) */
export const USER_SESSION_CACHE_TTL = 86400; // 24 hours

// ===========================================
// LIMITS & SIZES
// ===========================================

/** Maximum console buffer size (lines) */
export const CONSOLE_BUFFER_MAX_SIZE = 2000;

/** Maximum logs to keep in memory per bot */
export const MAX_LOGS_PER_BOT = 1000;

/** Maximum file upload size (bytes) */
export const MAX_FILE_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

/** Maximum message length for AI responses */
export const AI_MAX_RESPONSE_LENGTH = 2000;

/** Maximum conversation context window */
export const AI_CONTEXT_WINDOW = 20;

/** Default pagination limit */
export const DEFAULT_PAGE_LIMIT = 50;

/** Maximum pagination limit */
export const MAX_PAGE_LIMIT = 100;

// ===========================================
// RATE LIMITING
// ===========================================

/** Default rate limit window (ms) */
export const DEFAULT_RATE_LIMIT_WINDOW = 60000; // 1 minute

/** Default rate limit max requests */
export const DEFAULT_RATE_LIMIT_MAX = 100;

/** AI rate limit per user (requests per minute) */
export const AI_RATE_LIMIT_PER_USER = 20;

/** AI rate limit per channel (requests per minute) */
export const AI_RATE_LIMIT_PER_CHANNEL = 60;

// ===========================================
// JOB PRIORITIES
// ===========================================

export const JOB_PRIORITIES = {
  CREATE_BOT: 10,
  RESTART_BOT: 9,
  STOP_BOT: 9,
  START_BOT: 8,
  DELETE_BOT: 7,
  UPDATE_CONFIG: 5,
  HEALTH_CHECK: 3,
  CLEANUP: 1,
} as const;

// ===========================================
// STATUS CONSTANTS
// ===========================================

export const BOT_STATUS = {
  OFFLINE: 'OFFLINE',
  STARTING: 'STARTING',
  ONLINE: 'ONLINE',
  STOPPING: 'STOPPING',
  RESTARTING: 'RESTARTING',
  ERROR: 'ERROR',
} as const;

export const COLLABORATOR_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
} as const;

// ===========================================
// DISCORD LIMITS
// ===========================================

/** Maximum embed description length */
export const DISCORD_EMBED_DESCRIPTION_MAX = 4096;

/** Maximum embed title length */
export const DISCORD_EMBED_TITLE_MAX = 256;

/** Maximum embed fields */
export const DISCORD_EMBED_MAX_FIELDS = 25;

/** Maximum message length */
export const DISCORD_MESSAGE_MAX_LENGTH = 2000;

// ===========================================
// DEFAULT VALUES
// ===========================================

/** Default user credits */
export const DEFAULT_USER_CREDITS = 100;

/** Cost per bot creation */
export const CREDITS_PER_BOT = 10;

/** Default AI model */
export const DEFAULT_AI_MODEL = 'gpt-4o-mini';

/** Default AI temperature */
export const DEFAULT_AI_TEMPERATURE = 0.7;

/** Default AI max tokens */
export const DEFAULT_AI_MAX_TOKENS = 500;

// ===========================================
// REGEX PATTERNS
// ===========================================

/** Discord ID pattern */
export const DISCORD_ID_PATTERN = /^\d{17,19}$/;

/** Bot token pattern (basic validation) */
export const BOT_TOKEN_PATTERN = /^[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}$/;

/** UUID pattern */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
