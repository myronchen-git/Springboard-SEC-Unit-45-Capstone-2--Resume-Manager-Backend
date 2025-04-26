'use strict';

const jsonschema = require('jsonschema');

const schema = require('./userUpdate.json');

const { users } = require('../_testData');

// ==================================================

describe('userUpdate', () => {
  const oldPassword = '1234Abc!';
  const newPassword = users[0].password;

  test.each([[{ oldPassword, newPassword }]])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // Old password too short.
    [{ oldPassword: '1', newPassword }],
    // Old password too long.
    [{ oldPassword: oldPassword.repeat(4), newPassword }],
    // Missing old password.
    [{ newPassword }],
    // New password too short.
    [{ oldPassword, newPassword: '1' }],
    // New password too long.
    [{ oldPassword, newPassword: newPassword.repeat(4) }],
    // New password missing required characters.
    [{ oldPassword, newPassword: '1234567890' }],
    // New password missing required characters.
    [{ oldPassword, newPassword: 'abcdefghi' }],
    // New password missing required characters.
    [{ oldPassword, newPassword: 'ABCDEFGHI' }],
    // New password missing required symbol.
    [{ oldPassword, newPassword: '1234567890Ab' }],
    // Missing at least one of the required properties.
    [{ oldPassword }],
    // Missing everything.
    [{}],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
