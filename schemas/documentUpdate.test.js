'use strict';

const jsonschema = require('jsonschema');

const schema = require('./documentUpdate.json');

const { documents } = require('../_testData');

// ==================================================

describe('documentUpdate', () => {
  const document = Object.freeze({
    documentName: documents[0].documentName,
    isTemplate: documents[0].isTemplate,
    isLocked: true,
  });

  test.each([
    // Put each property in document into its own test.
    ...Object.entries(document).map((prop) => [Object.fromEntries([prop])]),
    // Contains all properties at once.
    [document],
  ])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // Document name too short.
    [{ documentName: '' }],
    // Wrong data type for template boolean.
    [{ isTemplate: 'true' }],
    // Wrong data type for locked boolean.
    [{ isLocked: 'true' }],
    // Missing everything.
    [{}],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
