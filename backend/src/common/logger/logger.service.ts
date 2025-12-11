import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private static logLevel: LogLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  private static isProduction = process.env.NODE_ENV === 'production';

  setContext(context: string): void {
    this.context = context;
  }

  static setLogLevel(level: LogLevel): void {
    LoggerService.logLevel = level;
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';

    if (LoggerService.isProduction) {
      // JSON format for production (easier to parse by log aggregators)
      return JSON.stringify({
        timestamp,
        level,
        context: ctx,
        message,
      });
    }

    // Pretty format for development
    const levelColors: Record<string, string> = {
      DEBUG: LOG_COLORS.gray,
      INFO: LOG_COLORS.green,
      WARN: LOG_COLORS.yellow,
      ERROR: LOG_COLORS.red,
    };

    const color = levelColors[level] || LOG_COLORS.reset;
    const levelPadded = level.padEnd(5);

    return `${LOG_COLORS.dim}${timestamp}${LOG_COLORS.reset} ${color}${levelPadded}${LOG_COLORS.reset} ${LOG_COLORS.cyan}[${ctx}]${LOG_COLORS.reset} ${message}`;
  }

  debug(message: string, context?: string): void {
    if (LoggerService.logLevel <= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  log(message: string, context?: string): void {
    if (LoggerService.logLevel <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  info(message: string, context?: string): void {
    this.log(message, context);
  }

  warn(message: string, context?: string): void {
    if (LoggerService.logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, trace?: string, context?: string): void {
    if (LoggerService.logLevel <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, context));
      if (trace && !LoggerService.isProduction) {
        console.error(`${LOG_COLORS.dim}${trace}${LOG_COLORS.reset}`);
      }
    }
  }

  verbose(message: string, context?: string): void {
    this.debug(message, context);
  }

  /**
   * Log with additional structured data
   */
  logWithData(level: 'debug' | 'info' | 'warn' | 'error', message: string, data: Record<string, unknown>, context?: string): void {
    const ctx = context || this.context || 'Application';

    if (LoggerService.isProduction) {
      const output = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        context: ctx,
        message,
        ...data,
      });

      if (level === 'error') {
        console.error(output);
      } else if (level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      const formatted = this.formatMessage(level.toUpperCase(), message, ctx);
      const dataStr = Object.keys(data).length > 0
        ? `\n${LOG_COLORS.dim}${JSON.stringify(data, null, 2)}${LOG_COLORS.reset}`
        : '';

      if (level === 'error') {
        console.error(formatted + dataStr);
      } else if (level === 'warn') {
        console.warn(formatted + dataStr);
      } else {
        console.log(formatted + dataStr);
      }
    }
  }
}

/**
 * Create a logger instance with a specific context
 */
export function createLogger(context: string): LoggerService {
  const logger = new LoggerService();
  logger.setContext(context);
  return logger;
}
