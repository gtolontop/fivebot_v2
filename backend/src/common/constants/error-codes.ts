/**
 * Comprehensive Error Codes for FiveBot
 * Each error has a unique code, message, and HTTP status
 */

export interface ErrorDefinition {
  code: string;
  message: string;
  httpStatus: number;
  description: string;
}

export const ERROR_CODES = {
  // ==================== AUTHENTICATION ERRORS (1xxx) ====================
  AUTH_INVALID_TOKEN: {
    code: 'E1001',
    message: 'Invalid or expired authentication token',
    httpStatus: 401,
    description: 'The provided JWT token is invalid or has expired',
  },
  AUTH_MISSING_TOKEN: {
    code: 'E1002',
    message: 'Authentication required',
    httpStatus: 401,
    description: 'No authentication token was provided',
  },
  AUTH_DISCORD_FAILED: {
    code: 'E1003',
    message: 'Discord authentication failed',
    httpStatus: 401,
    description: 'Failed to authenticate with Discord OAuth2',
  },
  AUTH_INSUFFICIENT_PERMISSIONS: {
    code: 'E1004',
    message: 'Insufficient permissions',
    httpStatus: 403,
    description: 'You do not have the required permissions for this action',
  },
  AUTH_ACCOUNT_DISABLED: {
    code: 'E1005',
    message: 'Account has been disabled',
    httpStatus: 403,
    description: 'Your account has been disabled by an administrator',
  },

  // ==================== USER ERRORS (2xxx) ====================
  USER_NOT_FOUND: {
    code: 'E2001',
    message: 'User not found',
    httpStatus: 404,
    description: 'The requested user does not exist',
  },
  USER_ALREADY_EXISTS: {
    code: 'E2002',
    message: 'User already exists',
    httpStatus: 409,
    description: 'A user with this Discord ID already exists',
  },
  USER_INSUFFICIENT_CREDITS: {
    code: 'E2003',
    message: 'Insufficient credits',
    httpStatus: 402,
    description: 'You do not have enough credits for this action',
  },
  USER_DELETE_FAILED: {
    code: 'E2004',
    message: 'Failed to delete account',
    httpStatus: 500,
    description: 'An error occurred while deleting your account',
  },
  USER_UPDATE_FAILED: {
    code: 'E2005',
    message: 'Failed to update user',
    httpStatus: 500,
    description: 'An error occurred while updating user information',
  },

  // ==================== BOT ERRORS (3xxx) ====================
  BOT_NOT_FOUND: {
    code: 'E3001',
    message: 'Bot not found',
    httpStatus: 404,
    description: 'The requested bot does not exist or you do not have access',
  },
  BOT_INVALID_TOKEN: {
    code: 'E3002',
    message: 'Invalid Discord bot token',
    httpStatus: 400,
    description: 'The provided Discord bot token is invalid or malformed',
  },
  BOT_TOKEN_UNAUTHORIZED: {
    code: 'E3003',
    message: 'Bot token authentication failed',
    httpStatus: 401,
    description: 'Discord rejected the bot token. Please verify it is correct',
  },
  BOT_ALREADY_RUNNING: {
    code: 'E3004',
    message: 'Bot is already running',
    httpStatus: 409,
    description: 'This bot is already online and running',
  },
  BOT_ALREADY_STOPPED: {
    code: 'E3005',
    message: 'Bot is already stopped',
    httpStatus: 409,
    description: 'This bot is already offline',
  },
  BOT_START_FAILED: {
    code: 'E3006',
    message: 'Failed to start bot',
    httpStatus: 500,
    description: 'An error occurred while starting the bot process',
  },
  BOT_STOP_FAILED: {
    code: 'E3007',
    message: 'Failed to stop bot',
    httpStatus: 500,
    description: 'An error occurred while stopping the bot process',
  },
  BOT_LIMIT_REACHED: {
    code: 'E3008',
    message: 'Bot limit reached',
    httpStatus: 403,
    description: 'You have reached the maximum number of bots for your account',
  },
  BOT_MISSING_INTENTS: {
    code: 'E3009',
    message: 'Bot missing required intents',
    httpStatus: 400,
    description: 'The bot is missing required Discord intents. Enable them in Developer Portal',
  },
  BOT_RATE_LIMITED: {
    code: 'E3010',
    message: 'Bot is rate limited',
    httpStatus: 429,
    description: 'Discord is rate limiting this bot. Please wait before trying again',
  },
  BOT_CREATE_FAILED: {
    code: 'E3011',
    message: 'Failed to create bot',
    httpStatus: 500,
    description: 'An error occurred while creating the bot',
  },
  BOT_DELETE_FAILED: {
    code: 'E3012',
    message: 'Failed to delete bot',
    httpStatus: 500,
    description: 'An error occurred while deleting the bot',
  },
  BOT_CONFIG_INVALID: {
    code: 'E3013',
    message: 'Invalid bot configuration',
    httpStatus: 400,
    description: 'The provided configuration is invalid or malformed',
  },

  // ==================== MODULE ERRORS (4xxx) ====================
  MODULE_NOT_FOUND: {
    code: 'E4001',
    message: 'Module not found',
    httpStatus: 404,
    description: 'The requested module does not exist',
  },
  MODULE_ALREADY_OWNED: {
    code: 'E4002',
    message: 'Module already owned',
    httpStatus: 409,
    description: 'You already own this module',
  },
  MODULE_ALREADY_INSTALLED: {
    code: 'E4003',
    message: 'Module already installed',
    httpStatus: 409,
    description: 'This module is already installed on the bot',
  },
  MODULE_NOT_INSTALLED: {
    code: 'E4004',
    message: 'Module not installed',
    httpStatus: 404,
    description: 'This module is not installed on the bot',
  },
  MODULE_NOT_OWNED: {
    code: 'E4005',
    message: 'Module not owned',
    httpStatus: 403,
    description: 'You do not own this module. Purchase it first',
  },
  MODULE_CORE_CANNOT_DISABLE: {
    code: 'E4006',
    message: 'Cannot disable core module',
    httpStatus: 400,
    description: 'Core modules cannot be disabled',
  },
  MODULE_CORE_CANNOT_UNINSTALL: {
    code: 'E4007',
    message: 'Cannot uninstall core module',
    httpStatus: 400,
    description: 'Core modules cannot be uninstalled',
  },
  MODULE_DEPENDENCY_MISSING: {
    code: 'E4008',
    message: 'Missing module dependencies',
    httpStatus: 400,
    description: 'This module requires other modules to be installed first',
  },
  MODULE_DEPENDENCY_CONFLICT: {
    code: 'E4009',
    message: 'Module dependency conflict',
    httpStatus: 400,
    description: 'Cannot uninstall: other modules depend on this one',
  },
  MODULE_PURCHASE_FAILED: {
    code: 'E4010',
    message: 'Module purchase failed',
    httpStatus: 500,
    description: 'An error occurred while purchasing the module',
  },
  MODULE_CONFIG_INVALID: {
    code: 'E4011',
    message: 'Invalid module configuration',
    httpStatus: 400,
    description: 'The provided module configuration is invalid',
  },

  // ==================== TICKET ERRORS (5xxx) ====================
  TICKET_NOT_FOUND: {
    code: 'E5001',
    message: 'Ticket not found',
    httpStatus: 404,
    description: 'The requested ticket does not exist',
  },
  TICKET_ALREADY_CLOSED: {
    code: 'E5002',
    message: 'Ticket is already closed',
    httpStatus: 409,
    description: 'This ticket has already been closed',
  },
  TICKET_LIMIT_REACHED: {
    code: 'E5003',
    message: 'Ticket limit reached',
    httpStatus: 403,
    description: 'You have reached the maximum number of open tickets',
  },
  TICKET_CATEGORY_NOT_FOUND: {
    code: 'E5004',
    message: 'Ticket category not found',
    httpStatus: 404,
    description: 'The requested ticket category does not exist',
  },
  TICKET_CREATE_FAILED: {
    code: 'E5005',
    message: 'Failed to create ticket',
    httpStatus: 500,
    description: 'An error occurred while creating the ticket',
  },

  // ==================== COLLABORATOR ERRORS (6xxx) ====================
  COLLABORATOR_NOT_FOUND: {
    code: 'E6001',
    message: 'Collaborator not found',
    httpStatus: 404,
    description: 'The requested collaborator does not exist',
  },
  COLLABORATOR_ALREADY_EXISTS: {
    code: 'E6002',
    message: 'Collaborator already exists',
    httpStatus: 409,
    description: 'This user is already a collaborator on this bot',
  },
  COLLABORATOR_SELF_INVITE: {
    code: 'E6003',
    message: 'Cannot invite yourself',
    httpStatus: 400,
    description: 'You cannot invite yourself as a collaborator',
  },
  COLLABORATOR_OWNER_REMOVE: {
    code: 'E6004',
    message: 'Cannot remove owner',
    httpStatus: 400,
    description: 'The bot owner cannot be removed as a collaborator',
  },

  // ==================== RATE LIMIT ERRORS (7xxx) ====================
  RATE_LIMIT_EXCEEDED: {
    code: 'E7001',
    message: 'Rate limit exceeded',
    httpStatus: 429,
    description: 'Too many requests. Please slow down',
  },
  RATE_LIMIT_API: {
    code: 'E7002',
    message: 'API rate limit exceeded',
    httpStatus: 429,
    description: 'API rate limit exceeded. Try again later',
  },

  // ==================== VALIDATION ERRORS (8xxx) ====================
  VALIDATION_FAILED: {
    code: 'E8001',
    message: 'Validation failed',
    httpStatus: 400,
    description: 'The request data failed validation',
  },
  VALIDATION_MISSING_FIELD: {
    code: 'E8002',
    message: 'Missing required field',
    httpStatus: 400,
    description: 'A required field is missing from the request',
  },
  VALIDATION_INVALID_FORMAT: {
    code: 'E8003',
    message: 'Invalid field format',
    httpStatus: 400,
    description: 'A field has an invalid format',
  },

  // ==================== SERVER ERRORS (9xxx) ====================
  INTERNAL_ERROR: {
    code: 'E9001',
    message: 'Internal server error',
    httpStatus: 500,
    description: 'An unexpected error occurred',
  },
  DATABASE_ERROR: {
    code: 'E9002',
    message: 'Database error',
    httpStatus: 500,
    description: 'A database error occurred',
  },
  REDIS_ERROR: {
    code: 'E9003',
    message: 'Cache service error',
    httpStatus: 500,
    description: 'A cache service error occurred',
  },
  QUEUE_ERROR: {
    code: 'E9004',
    message: 'Queue service error',
    httpStatus: 500,
    description: 'A job queue error occurred',
  },
  DISCORD_API_ERROR: {
    code: 'E9005',
    message: 'Discord API error',
    httpStatus: 502,
    description: 'Failed to communicate with Discord API',
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Get error definition by code
 */
export function getErrorByCode(code: ErrorCode): ErrorDefinition {
  return ERROR_CODES[code];
}

/**
 * Create error response object
 */
export function createErrorResponse(
  code: ErrorCode,
  details?: string,
  metadata?: Record<string, any>,
) {
  const error = ERROR_CODES[code];
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: details || error.description,
      ...(metadata && { metadata }),
    },
    timestamp: new Date().toISOString(),
  };
}
