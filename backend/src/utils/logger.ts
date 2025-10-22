import { Request, Response, NextFunction } from 'express';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  requestId?: string;
  userId?: string;
  duration?: number;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, requestId, userId, duration } = entry;
    
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (requestId) logMessage += ` [req:${requestId}]`;
    if (userId) logMessage += ` [user:${userId}]`;
    if (duration !== undefined) logMessage += ` [${duration}ms]`;
    
    if (context && Object.keys(context).length > 0) {
      logMessage += ` | Context: ${JSON.stringify(context)}`;
    }
    
    return logMessage;
  }

  private log(level: LogLevel, message: string, context?: any, requestId?: string, userId?: string, duration?: number): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      requestId,
      userId,
      duration
    };

    const formattedLog = this.formatLog(entry);
    
    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
    }
  }

  error(message: string, context?: any, requestId?: string, userId?: string): void {
    this.log(LogLevel.ERROR, message, context, requestId, userId);
  }

  warn(message: string, context?: any, requestId?: string, userId?: string): void {
    this.log(LogLevel.WARN, message, context, requestId, userId);
  }

  info(message: string, context?: any, requestId?: string, userId?: string): void {
    this.log(LogLevel.INFO, message, context, requestId, userId);
  }

  debug(message: string, context?: any, requestId?: string, userId?: string): void {
    this.log(LogLevel.DEBUG, message, context, requestId, userId);
  }

  // Express middleware for request logging
  requestLogger() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add request ID to request object for use in other middleware
      (req as any).requestId = requestId;
      
      // Log request start
      this.info('Request started', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        headers: {
          'content-type': req.get('Content-Type'),
          'authorization': req.get('Authorization') ? '[REDACTED]' : undefined
        }
      }, requestId);

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any, cb?: any) {
        const duration = Date.now() - startTime;
        
        // Log response
        logger.info('Request completed', {
          statusCode: res.statusCode,
          contentLength: res.get('Content-Length'),
          duration
        }, requestId);

        // Call original end method
        return originalEnd.call(this, chunk, encoding, cb);
      };

      next();
    };
  }

  // Database operation logging
  dbOperation(operation: string, table: string, duration: number, success: boolean, context?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Database ${operation} on ${table}`;
    
    this.log(level, message, {
      ...context,
      success,
      operation,
      table
    }, undefined, undefined, duration);
  }

  // Authentication logging
  authEvent(event: string, userId?: string, success: boolean = true, context?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Authentication: ${event}`;
    
    this.log(level, message, {
      ...context,
      success,
      event
    }, undefined, userId);
  }

  // Socket.io event logging
  socketEvent(event: string, userId?: string, roomId?: string, context?: any): void {
    this.info(`Socket event: ${event}`, {
      ...context,
      event,
      roomId
    }, undefined, userId);
  }

  // Error logging with stack trace
  logError(error: Error, context?: any, requestId?: string, userId?: string): void {
    this.error(error.message, {
      ...context,
      stack: error.stack,
      name: error.name
    }, requestId, userId);
  }

  // Performance logging
  performance(operation: string, duration: number, context?: any): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Performance: ${operation}`, {
      ...context,
      operation
    }, undefined, undefined, duration);
  }
}

// Create singleton instance
export const logger = new Logger();

// Export types and logger instance
export default logger;
