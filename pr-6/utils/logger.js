const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom format for development (console)
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Custom format for production (files)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// File transports for production
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: productionFormat,
  level: 'debug',
});

const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: productionFormat,
  level: 'error',
});

// Create logger instance
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: isDevelopment ? developmentFormat : productionFormat,
  transports: isDevelopment
    ? [
        // Development: console + error log file (errors always go to file)
        new winston.transports.Console({
          format: developmentFormat,
        }),
        errorFileTransport, // Always log errors to file, even in development
      ]
    : [
        // Production: console + all files
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        combinedFileTransport,
        errorFileTransport,
      ],
  // Handle exceptions
  exceptionHandlers: isDevelopment
    ? [new winston.transports.Console({ format: developmentFormat })]
    : [
        new winston.transports.Console(),
        new DailyRotateFile({
          filename: path.join(logsDir, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: productionFormat,
        }),
      ],
  // Handle promise rejections
  rejectionHandlers: isDevelopment
    ? [new winston.transports.Console({ format: developmentFormat })]
    : [
        new winston.transports.Console(),
        new DailyRotateFile({
          filename: path.join(logsDir, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: productionFormat,
        }),
      ],
});

// Create a stream object for morgan HTTP logger integration
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
