/**
 * Logging Module
 * Structured logging with support for different log levels
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'json';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
  requestId?: string;
}

/**
 * Format log entry based on LOG_FORMAT
 */
function formatLog(entry: LogEntry): string {
  if (LOG_FORMAT === 'json') {
    return JSON.stringify(entry);
  }

  const { timestamp, level, message, context, error } = entry;
  let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`;
  }

  if (error) {
    output += `\nError: ${error.message}`;
    if (error.stack) {
      output += `\n${error.stack}`;
    }
  }

  return output;
}

/**
 * Logger class
 */
class Logger {
  private requestId?: string;

  constructor(requestId?: string) {
    this.requestId = requestId;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL as LogLevel];
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      requestId: this.requestId,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = formatLog(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error);
  }

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }
}

// Global logger instance
export const logger = new Logger();

/**
 * Create logger with request ID
 */
export function createLogger(requestId?: string): Logger {
  return new Logger(requestId);
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  userId: number,
  action: string,
  resourceType: string,
  resourceId: string,
  changes?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const db = await import('./db');
    await db.createAuditLog({
      userId,
      action: action as any,
      resourceType,
      resourceId,
      changes,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    logger.error('Failed to log audit event', error as Error);
  }
}

/**
 * Log performance metric
 */
export function logPerformance(
  operation: string,
  duration: number,
  context?: Record<string, any>
) {
  if (duration > 1000) {
    logger.warn(`Slow operation: ${operation}`, {
      duration: `${duration}ms`,
      ...context,
    });
  } else {
    logger.debug(`Operation completed: ${operation}`, {
      duration: `${duration}ms`,
      ...context,
    });
  }
}

/**
 * Measure operation performance
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logPerformance(operation, duration, context);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Operation failed: ${operation}`, error as Error, {
      duration: `${duration}ms`,
      ...context,
    });
    throw error;
  }
}
