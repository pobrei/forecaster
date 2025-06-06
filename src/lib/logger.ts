import winston from 'winston';
import { NextRequest } from 'next/server';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for structured logging
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Create transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: format,
  }),
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }) as winston.transport,
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }) as winston.transport
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
});

// Request logging utility
export const logRequest = (req: NextRequest, additionalData?: Record<string, any>) => {
  logger.http('API Request', {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

// Response logging utility
export const logResponse = (
  req: NextRequest,
  status: number,
  duration: number,
  additionalData?: Record<string, any>
) => {
  logger.http('API Response', {
    method: req.method,
    url: req.url,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

// Business logic logging
export const logGPXProcessing = (
  fileName: string,
  pointCount: number,
  processingTime: number,
  success: boolean,
  error?: string
) => {
  logger.info('GPX Processing', {
    fileName,
    pointCount,
    processingTime: `${processingTime}ms`,
    success,
    error,
    timestamp: new Date().toISOString(),
  });
};

export const logWeatherAPICall = (
  pointCount: number,
  responseTime: number,
  success: boolean,
  rateLimited?: boolean,
  error?: string
) => {
  logger.info('Weather API Call', {
    pointCount,
    responseTime: `${responseTime}ms`,
    success,
    rateLimited,
    error,
    timestamp: new Date().toISOString(),
  });
};

export const logPDFExport = (
  routePoints: number,
  fileSize: number,
  processingTime: number,
  success: boolean,
  error?: string
) => {
  logger.info('PDF Export', {
    routePoints,
    fileSize: `${fileSize} bytes`,
    processingTime: `${processingTime}ms`,
    success,
    error,
    timestamp: new Date().toISOString(),
  });
};

export const logUserAction = (
  action: string,
  userId?: string,
  additionalData?: Record<string, any>
) => {
  logger.info('User Action', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};
