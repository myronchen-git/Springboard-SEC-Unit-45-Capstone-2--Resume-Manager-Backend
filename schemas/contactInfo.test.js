'use strict';

const jsonschema = require('jsonschema');

const schema = require('./contactInfo.json');

const { contactInfos } = require('../_testData');

// ==================================================

describe('contactInfo', () => {
  // Ensure that contactInfo has all possible properties.
  const contactInfo = { ...contactInfos[1] };
  // Remove username because it is not sent as input.
  delete contactInfo.username;
  Object.freeze(contactInfo);

  test.each([
    // Contains no properties.
    [{}],
    // Put each property in contactInfo into its own test.
    ...Object.entries(contactInfo).map((prop) => [Object.fromEntries([prop])]),
    // Contains all properties at once.
    [contactInfo],
    // Empty Strings for optional properties.
    ...Object.keys(contactInfo).reduce((tests, prop) => {
      if (prop !== 'fullName') tests.push([{ [prop]: '' }]);
      return tests;
    }, []),
    [{ phone: '123-456-7890' }],
    [{ phone: '(123) 456-7890' }],
    [{ phone: '+123 45 6789' }],
    [{ phone: '+1 (123) 12 12345' }],
  ])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // Full name too short.
    [{ fullName: '' }],
    // Full name too long.
    [{ fullName: 'a'.repeat(51) }],
    // Email not in correct format.
    [{ email: 'not@email' }],
    // Phone number too long.
    [{ phone: '1'.repeat(21) }],
    // Phone number not valid.
    [{ phone: '123-456`-7890' }],
    // Phone number not valid.
    [{ phone: '-----' }],
    // Phone number not valid.
    [{ phone: '((12345))' }],
    // Phone number not valid.
    [{ phone: '(123)-----' }],
    // Linkedin not in correct format.
    [{ linkedin: 'linkedin.com/user/user1' }],
    // Linkedin not in correct format.
    [{ linkedin: 'example.com/user1' }],
    // Github not in correct format.
    [{ github: 'github/user1' }],
    // Github not in correct format.
    [{ github: 'example.com/user1' }],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
