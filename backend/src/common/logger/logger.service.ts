import { Injectable, LoggerService as NestLoggerService, Scope, Optional, Inject } from '@nestjs/common';

export const LOGGER_CONTEXT = 'LOGGER_CONTEXT';

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
  private context: string;
  private static logLevel: LogLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  private static isProduction = process.env.NODE_ENV === 'production';

  constructor(@Optional() @Inject(LOGGER_CONTEXT) context?: string) {
    this.context = context || 'Application';
  }

  setContext(context: string): void {
    this.context = context;
  }

  static setLogLevel(level: LogLevel): void {
    LoggerService.logLevel = level;
  }

  private formatArgs(...args: unknown[]): string {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();

    if (LoggerService.isProduction) {
      // JSON format for production (easier to parse by log aggregators)
      return JSON.stringify({
        timestamp,
        level,
        context: this.context,
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

    return `${LOG_COLORS.dim}${timestamp}${LOG_COLORS.reset} ${color}${levelPadded}${LOG_COLORS.reset} ${LOG_COLORS.cyan}[${this.context}]${LOG_COLORS.reset} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (LoggerService.logLevel <= LogLevel.DEBUG) {
      const fullMessage = args.length > 0 ? `${message} ${this.formatArgs(...args)}` : message;
      console.log(this.formatMessage('DEBUG', fullMessage));
    }
  }

  log(message: string, ...args: unknown[]): void {
    if (LoggerService.logLevel <= LogLevel.INFO) {
      const fullMessage = args.length > 0 ? `${message} ${this.formatArgs(...args)}` : message;
      console.log(this.formatMessage('INFO', fullMessage));
    }
  }

  info(message: string, ...args: unknown[]): void {
    this.log(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (LoggerService.logLevel <= LogLevel.WARN) {
      const fullMessage = args.length > 0 ? `${message} ${this.formatArgs(...args)}` : message;
      console.warn(this.formatMessage('WARN', fullMessage));
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (LoggerService.logLevel <= LogLevel.ERROR) {
      const fullMessage = args.length > 0 ? `${message} ${this.formatArgs(...args)}` : message;
      console.error(this.formatMessage('ERROR', fullMessage));

      // Print stack trace for Error objects in development
      if (!LoggerService.isProduction) {
        for (const arg of args) {
          if (arg instanceof Error && arg.stack) {
            console.error(`${LOG_COLORS.dim}${arg.stack}${LOG_COLORS.reset}`);
            break;
          }
        }
      }
    }
  }

  verbose(message: string, ...args: unknown[]): void {
    this.debug(message, ...args);
  }

  /**
   * Log with additional structured data
   */
  logWithData(level: 'debug' | 'info' | 'warn' | 'error', message: string, data: Record<string, unknown>): void {
    if (LoggerService.isProduction) {
      const output = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        context: this.context,
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
      const formatted = this.formatMessage(level.toUpperCase(), message);
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
  return new LoggerService(context);
}
