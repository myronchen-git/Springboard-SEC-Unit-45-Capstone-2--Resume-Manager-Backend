'use strict';

const jsonschema = require('jsonschema');

const schema = require('./userSignin.json');

const { users } = require('../_testData');

// ==================================================

describe('userSignin', () => {
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
