'use strict';

const jsonschema = require('jsonschema');

const schema = require('./userRegister.json');

const { users } = require('../_testData');

// ==================================================

describe('userRegister', () => {
  const user = users[0];

  test.each([[user], [{ username: 'abc', password: user.password }]])(
    'Success for input %s',
    (str) => {
      // Act
      const result = jsonschema.validate(str, schema);

      // Assert
      expect(result.valid).toBeTruthy();
    }
  );

  test.each([
    // Username too short.
    [{ username: 'us', password: user.password }],
    // Username has invalid character.
    [{ username: 'user 123', password: user.password }],
    // Username has invalid character.
    [{ username: 'user!', password: user.password }],
    // Username too long.
    [
      {
        username: 'a'.repeat(31),
        password: user.password,
      },
    ],
    // Missing username.
    [{ password: user.password }],
    // Password too short.
    [{ username: user.username, password: '1' }],
    // Password too long.
    [
      {
        username: user.username,
        password: user.password.repeat(5),
      },
    ],
    // Password missing required characters.
    [{ username: user.username, password: '1234567890' }],
    // Password missing required characters.
    [{ username: user.username, password: 'abcdefghi' }],
    // Password missing required characters.
    [{ username: user.username, password: 'ABCDEFGHI' }],
    // Password missing required symbol.
    [{ username: user.username, password: '1234567890Ab' }],
    // Missing password.
    [{ username: user.username }],
    // Missing everything.
    [{}],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
