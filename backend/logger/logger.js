const path = require('path');
const winston = require('winston');

const customFormat = winston.format.printf(
  ({ level, message, timestamp, requestId, ...meta }) => {
    const reqIdPart = requestId ? `[${requestId}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${reqIdPart} ${message}${metaStr}`;
  }
);

const options = {
  file: {
    level: process.env.LOG_LEVEL_FILE || 'info',
    filename: path.join(__dirname, '../logs/app.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  },
  console: {
    level: process.env.LOG_LEVEL_CONSOLE || 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      customFormat
    ),
  },
};

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.Console(options.console),
  ],
  exitOnError: false,
});

logger.stream = {
  write(message, encoding) {
    logger.info(message.trim());
  },
};

logger.child = function (context) {
  const childLogger = {};
  ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].forEach(
    level => {
      childLogger[level] = (message, meta = {}) => {
        logger[level](message, { ...context, ...meta });
      };
    }
  );
  return childLogger;
};

module.exports = logger;
