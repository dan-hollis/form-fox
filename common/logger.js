const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
require('fs').mkdirSync(logsDir, { recursive: true });

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Configure daily rotating file for all logs
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'bot-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // Keep logs for 30 days
  format: logFormat
});

// Configure daily rotating file for error logs only
const errorRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // Keep error logs for 30 days
  level: 'error',
  format: logFormat
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console output (will go to journalctl via systemd)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level}]: ${stack || message}`;
        })
      )
    }),
    // Daily rotating file for all logs
    dailyRotateFileTransport,
    // Daily rotating file for errors only
    errorRotateFileTransport
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// Log rotation events
dailyRotateFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info(`Log file rotated from ${oldFilename} to ${newFilename}`);
});

dailyRotateFileTransport.on('archive', (zipFilename) => {
  logger.info(`Log file archived: ${zipFilename}`);
});

// Capture Node.js process warnings and output
if (process.env.NODE_ENV !== 'test') {
  // Track if we're currently logging to prevent loops
  let isCapturingStderr = false;
  
  // Capture stderr for deprecation warnings and other Node.js output
  const originalStderrWrite = process.stderr.write;
  process.stderr.write = function(chunk, encoding, callback) {
    let shouldSuppressOriginal = false;
    
    // Only capture if we're not already in a logging operation
    if (typeof chunk === 'string' && !isCapturingStderr && chunk.trim().length > 0) {
      // Skip if it contains Winston's own output markers
      if (!chunk.includes('[INFO]') && 
          !chunk.includes('[ERROR]') && 
          !chunk.includes('[WARN]') &&
          !chunk.includes('[DEBUG]') &&
          !chunk.includes('[VERBOSE]')) {
        
        isCapturingStderr = true;
        try {
          // Check if it's a deprecation warning or other Node.js output
          if (chunk.includes('DeprecationWarning') || chunk.includes('Warning')) {
            logger.warn(`[NODE] ${chunk.trim()}`);
            shouldSuppressOriginal = true; // Suppress since we logged it
          } else {
            logger.error(`[STDERR] ${chunk.trim()}`);
            shouldSuppressOriginal = true; // Suppress since we logged it
          }
        } catch (err) {
          // Ignore logging errors to prevent further loops
        }
        isCapturingStderr = false;
      }
    }
    
    // Only call original stderr write if we're NOT suppressing it
    if (!shouldSuppressOriginal) {
      return originalStderrWrite.call(process.stderr, chunk, encoding, callback);
    } else {
      // Simulate successful write without actually writing to stderr
      if (callback && typeof callback === 'function') {
        process.nextTick(callback);
      }
      return true;
    }
  };

  // Also capture stdout for library output like "Loading app commands..."
  let isCapturingStdout = false;
  const originalStdoutWrite = process.stdout.write;
  process.stdout.write = function(chunk, encoding, callback) {
    let shouldSuppressOriginal = false;
    
    // Only capture specific useful output, not Winston's own logs
    if (typeof chunk === 'string' && !isCapturingStdout && chunk.trim().length > 0) {
      // Skip Winston's output and timestamps
      if (!chunk.includes('[INFO]') && 
          !chunk.includes('[ERROR]') && 
          !chunk.includes('[WARN]') &&
          !chunk.includes('[DEBUG]') &&
          !chunk.includes('[VERBOSE]') &&
          !chunk.match(/^\d{4}-\d{2}-\d{2}/)) { // Skip timestamp lines
        
        isCapturingStdout = true;
        try {
          logger.info(`[STDOUT] ${chunk.trim()}`);
          shouldSuppressOriginal = true; // Suppress since we logged it
        } catch (err) {
          // Ignore logging errors to prevent further loops
        }
        isCapturingStdout = false;
      }
    }
    
    // Only call original stdout write if we're NOT suppressing it
    if (!shouldSuppressOriginal) {
      return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
    } else {
      // Simulate successful write without actually writing to stdout
      if (callback && typeof callback === 'function') {
        process.nextTick(callback);
      }
      return true;
    }
  };
}

module.exports = logger; 