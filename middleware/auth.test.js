'use strict';

const jwt = require('jsonwebtoken');

const { authenticateJWT, ensureLoggedIn } = require('./auth');

const { UnauthorizedError } = require('../errors/appErrors');

const { SECRET_KEY } = require('../config');

// ==================================================

const username = 'user1';

// --------------------------------------------------

describe('authenticateJWT', () => {
  // Manually create JWT to make tests resemble unit tests as much as possible.
  const validJWT = jwt.sign({ username }, SECRET_KEY);
  const invalidJWT = jwt.sign({ username }, 'wrong');

  test('Successfully authenticates a valid JWT.', () => {
    // Arrange
    const req = { headers: { authorization: `Bearer ${validJWT}` } };
    const res = { locals: {} };
    const next = (err) => {
      // Assert
      expect(err).not.toBeDefined();
    };

    // Act
    authenticateJWT(req, res, next);

    // Assert
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username,
      },
    });
  });

  test('Continues when there is no authorization header.', () => {
    // Arrange
    const req = {};
    const res = { locals: {} };
    const next = (err) => {
      // Assert
      expect(err).not.toBeDefined();
    };

    // Act
    authenticateJWT(req, res, next);

    // Assert
    expect(res.locals).toEqual({});
  });

  test('Continues when the authentication token is invalid.', () => {
    // Arrange
    const req = { headers: { authorization: `Bearer ${invalidJWT}` } };
    const res = { locals: {} };
    const next = (err) => {
      // Assert
      expect(err).not.toBeDefined();
    };

    // Act
    authenticateJWT(req, res, next);

    // Assert
    expect(res.locals).toEqual({});
  });
});

// --------------------------------------------------

describe('ensureLoggedIn', () => {
  test('Continues when there is a user logged in.', () => {
    // Arrange
    const req = {};
    const res = { locals: { user: { username } } };
    const next = (err) => {
      // Assert
      expect(err).not.toBeDefined();
    };

    // Act
    ensureLoggedIn(req, res, next);
  });

  test('Throws an Error if no user is logged in.', () => {
    // Arrange
    const req = {};
    const res = { locals: {} };
    const next = (err) => {
      // Assert
      expect(err).toBeInstanceOf(UnauthorizedError);
    };

    // Act
    ensureLoggedIn(req, res, next);
  });
});
