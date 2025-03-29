'use strict';

require('dotenv').config();

const logger = require('./util/logger');

// ==================================================

const SECRET_KEY = process.env.SECRET_KEY || 'secret-dev';

const PORT = +process.env.PORT || 3001;

const databaseUriLocalDomain = 'postgresql://postgres@localhost';
const DATABASE_URI =
  process.env.NODE_ENV === 'test'
    ? databaseUriLocalDomain + '/resume_manager_test'
    : process.env.DATABASE_URL || databaseUriLocalDomain + '/resume_manager';

const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === 'test' ? 1 : 12;

logger.info('Resume Manager Config:');
logger.info('NODE_ENV: ' + process.env.NODE_ENV);
logger.info('SECRET_KEY: ' + SECRET_KEY);
logger.info('PORT: ' + PORT.toString());
logger.info('BCRYPT_WORK_FACTOR: ' + BCRYPT_WORK_FACTOR);
logger.info('DATABASE_URI: ' + DATABASE_URI);
logger.info('---');

// ==================================================

module.exports = {
  SECRET_KEY,
  PORT,
  BCRYPT_WORK_FACTOR,
  DATABASE_URI,
};
