import winston from 'winston';

const isDev = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'dunning-api' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
    }),

    // Write all logs to file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    }),

    // Write errors to separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
  ],
});