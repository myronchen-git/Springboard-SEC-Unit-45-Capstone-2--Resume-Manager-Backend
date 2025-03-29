/** Errors related to the User model. */

'use strict';

const { BadRequestError, UnauthorizedError } = require('./appErrors');

// ==================================================

class RegistrationError extends BadRequestError {
  constructor(message) {
    super(message);
    this.name = 'RegistrationError';
  }
}

class SigninError extends UnauthorizedError {
  constructor(message) {
    super(message);
    this.name = 'SigninError';
  }
}

// ==================================================

module.exports = { RegistrationError, SigninError };
