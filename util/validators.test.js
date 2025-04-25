'use strict';

const { runJsonSchemaValidator } = require('./validators');
const contactInfoSchema = require('../schemas/contactInfo.json');
const userRegisterSchema = require('../schemas/userRegister.json');

const { BadRequestError } = require('../errors/appErrors');

const User = require('../models/user');
const { contactInfos, users } = require('../_testData');

// ==================================================

describe('runJsonSchemaValidator', () => {
  test('Does not return or throw anything if request body follows JSON schema.', () => {
    // Arrange
    const reqBody = { ...contactInfos[1] };
    delete reqBody.username;

    // Act / Assert
    expect(() =>
      runJsonSchemaValidator(contactInfoSchema, reqBody, '')
    ).not.toThrow();
  });

  test('Throws an Error if request body is not valid against JSON schema.', () => {
    // Arrange
    const reqBody = { email: 'email' };

    // Act / Assert
    expect(() =>
      runJsonSchemaValidator(contactInfoSchema, reqBody, '')
    ).toThrow(BadRequestError);
  });

  test.each([
    [
      userRegisterSchema,
      { username: 'A', password: users[0].password },
      User.usernameRequirementsMessage,
    ],
    [
      userRegisterSchema,
      { username: users[0].username, password: '1234567890' },
      User.passwordRequirementsMessage,
    ],
    [
      contactInfoSchema,
      { fullName: '' },
      'instance.fullName does not meet minimum length of 2',
    ],
    [contactInfoSchema, { email: 'email' }, 'Invalid email.'],
    [contactInfoSchema, { linkedin: 'linkedin' }, 'Invalid linkedin.'],
    [contactInfoSchema, { github: 'github' }, 'Invalid github.'],
  ])(
    'Gives correct error messages for case %#.',
    async (schema, reqBody, errorMessage) => {
      // Act / Assert
      expect(() => runJsonSchemaValidator(schema, reqBody, '')).toThrow(
        new BadRequestError(errorMessage)
      );
    }
  );
});
