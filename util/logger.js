'use strict';

const { createLogger, transports, format } = require('winston');

// ==================================================

const logDir = process.env.NODE_ENV === 'test' ? './logs-dev/' : './logs/';
const logLevel = process.env.NODE_ENV === 'test' ? 'debug' : 'info';

const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: logDir + 'app.log' }),
    new transports.File({ filename: logDir + 'error.log', level: 'error' }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: logDir + 'exceptions.log' }),
  ],
});

// https://stackoverflow.com/a/28824464
logger.stream = {
  write: (message) => logger.info(message),
};

// ==================================================

module.exports = logger;
