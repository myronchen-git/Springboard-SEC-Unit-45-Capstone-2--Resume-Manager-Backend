'use strict';

const { verifyJWT } = require('../util/tokens');

const { UnauthorizedError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Authenticates a JSON web token, if there is one in the header.  Stores the
 * authentication token payload in "res.locals.user".  If there is no token or
 * if it is invalid, then no error is thrown.
 */
function authenticateJWT(req, res, next) {
  const logPrefix = 'middleware/auth - authenticateJWT()';

  const authHeader = req.headers?.authorization;

  try {
    if (authHeader) {
      const authToken = authHeader.replace(/^[Bb]earer /, '').trim();
      res.locals.user = verifyJWT(authToken);
    }

    return next();
  } catch (err) {
    logger.warn(`${logPrefix}: Invalid JWT for authorization "${authHeader}".`);
    return next();
  }
}

/**
 * Checks to see if there is a user logged in.  If not, throws
 * UnauthorizedError.
 */

function ensureLoggedIn(req, res, next) {
  const logPrefix = 'middleware/auth - ensureLoggedIn()';

  try {
    if (!res.locals.user) {
      logger.error(
        `${logPrefix}: No user logged in / No authentication token.`
      );

      throw new UnauthorizedError('Authentication token required.');
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

// ==================================================

module.exports = { authenticateJWT, ensureLoggedIn };
