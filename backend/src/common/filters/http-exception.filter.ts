import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: unknown;
}

/**
 * Global HTTP Exception Filter
 * Standardizes all error responses across the API
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: string | undefined;
    let details: unknown = undefined;

    // Handle different exception types
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) || exception.message;
        error = responseObj.error as string;
        details = responseObj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      // Handle specific error types
      if (exception.name === 'PrismaClientKnownRequestError') {
        statusCode = this.handlePrismaError(exception as any);
        message = this.getPrismaErrorMessage(exception as any);
      } else if (exception.name === 'JsonWebTokenError') {
        statusCode = HttpStatus.UNAUTHORIZED;
        message = 'Invalid or expired token';
      } else if (exception.name === 'TokenExpiredError') {
        statusCode = HttpStatus.UNAUTHORIZED;
        message = 'Token has expired';
      }
    }

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Only include error name in development
    if (process.env.NODE_ENV === 'development' && error) {
      errorResponse.error = error;
    }

    // Only include details if present
    if (details) {
      errorResponse.details = details;
    }

    // Log the error
    this.logError(request, statusCode, exception);

    response.status(statusCode).json(errorResponse);
  }

  private handlePrismaError(error: { code?: string }): number {
    switch (error.code) {
      case 'P2002':
        return HttpStatus.CONFLICT; // Unique constraint violation
      case 'P2025':
        return HttpStatus.NOT_FOUND; // Record not found
      case 'P2003':
        return HttpStatus.BAD_REQUEST; // Foreign key constraint
      case 'P2034':
        return HttpStatus.CONFLICT; // Transaction failed (concurrency)
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getPrismaErrorMessage(error: { code?: string; meta?: { target?: string[] } }): string {
    switch (error.code) {
      case 'P2002':
        const field = error.meta?.target?.[0] || 'field';
        return `A record with this ${field} already exists`;
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Related record not found';
      case 'P2034':
        return 'Operation failed due to concurrent modification. Please try again.';
      default:
        return 'Database operation failed';
    }
  }

  private logError(request: Request, statusCode: number, exception: unknown): void {
    const message = exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    // Only log server errors (5xx) as errors, client errors (4xx) as warnings
    if (statusCode >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${statusCode}: ${message}`,
        stack
      );
    } else if (statusCode >= 400 && statusCode < 500) {
      // Log 4xx as debug in production, warn in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(`[${request.method}] ${request.url} - ${statusCode}: ${message}`);
      }
    }
  }
}
