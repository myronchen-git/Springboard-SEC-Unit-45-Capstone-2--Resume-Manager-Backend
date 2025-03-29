/** General Errors. */

'use strict';

// ==================================================

/**
 * The overall, generic application Error.  The status code used is currently
 * HTTP.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/**
 * Represents an Error caused by a client.
 */
class AppClientError extends AppError {
  constructor(message, statusCode) {
    super(message, statusCode);
    this.name = 'AppClientError';
  }
}

/**
 * Represents an Error caused by the server.
 */
class AppServerError extends AppError {
  constructor(message, statusCode) {
    super(message, statusCode);
    this.name = 'AppServerError';
  }
}

// --------------------------------------------------

class BadRequestError extends AppClientError {
  constructor(message) {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

class UnauthorizedError extends AppClientError {
  constructor(message) {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppClientError {
  constructor(message) {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppClientError {
  constructor(message) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// --------------------------------------------------

/**
 * Represents any issue with the arguments of a function.
 */
class ArgumentError extends BadRequestError {
  constructor(message) {
    super(message);
    this.name = 'ArgumentError';
  }
}

// ==================================================

module.exports = {
  AppError,
  AppClientError,
  AppServerError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ArgumentError,
};
