'use strict';

const jwt = require('jsonwebtoken');

const { SECRET_KEY } = require('../config');

// ==================================================

/**
 * Creates a JSON web token by using user info.
 *
 * @param {Object} user - Contains the user data to store in the JWT.
 * @returns {String} JWT.
 */
function createJWT(user) {
  const payload = { username: user.username };

  return jwt.sign(payload, SECRET_KEY);
}

/**
 * Verifies if the JWT is valid and returns the encoded user info.
 *
 * @param {String} token - JSON web token given by client for authentication.
 * @returns {Object} The payload containing user data.
 */
function verifyJWT(token) {
  return jwt.verify(token, SECRET_KEY);
}

// ==================================================

module.exports = { createJWT, verifyJWT };
