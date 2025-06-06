// Edge Runtime compatible logger
// This logger is designed to work in Next.js Edge Runtime (middleware)
// where Node.js APIs like process.nextTick are not available

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: string;
  status?: number;
}

class EdgeLogger {
  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, ...meta } = entry;
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };

    // Use console methods for different log levels
    switch (level) {
      case 'error':
        console.error(this.formatLogEntry(entry));
        break;
      case 'warn':
        console.warn(this.formatLogEntry(entry));
        break;
      case 'info':
        console.info(this.formatLogEntry(entry));
        break;
      case 'debug':
        console.debug(this.formatLogEntry(entry));
        break;
      default:
        console.log(this.formatLogEntry(entry));
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  // Request logging utility
  logRequest(request: Request, additionalData?: Record<string, any>) {
    this.info('Request', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      ...additionalData,
    });
  }

  // Response logging utility
  logResponse(
    request: Request,
    status: number,
    duration: number,
    additionalData?: Record<string, any>
  ) {
    this.info('Response', {
      method: request.method,
      url: request.url,
      status,
      duration: `${duration}ms`,
      ...additionalData,
    });
  }

  // Rate limiting logging
  logRateLimit(
    request: Request,
    duration: number,
    remaining: number,
    resetTime: number
  ) {
    this.warn('Rate Limited', {
      method: request.method,
      url: request.url,
      duration: `${duration}ms`,
      remaining,
      resetTime,
    });
  }
}

// Export singleton instance
export const edgeLogger = new EdgeLogger();

// Convenience functions
export const logRequest = (request: Request, data?: any) => 
  edgeLogger.logRequest(request, data);

export const logResponse = (request: Request, status: number, duration: number, data?: any) => 
  edgeLogger.logResponse(request, status, duration, data);

export const logRateLimit = (request: Request, duration: number, remaining: number, resetTime: number) => 
  edgeLogger.logRateLimit(request, duration, remaining, resetTime);

export const logInfo = (message: string, data?: any) => 
  edgeLogger.info(message, data);

export const logWarn = (message: string, data?: any) => 
  edgeLogger.warn(message, data);

export const logError = (message: string, data?: any) => 
  edgeLogger.error(message, data);

export const logDebug = (message: string, data?: any) => 
  edgeLogger.debug(message, data);
