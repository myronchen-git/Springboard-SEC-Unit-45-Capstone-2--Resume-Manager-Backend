'use strict';

const jsonschema = require('jsonschema');

const schema = require('./documentNew.json');

const { documents } = require('../_testData');

// ==================================================

describe('documentNew', () => {
  const document = Object.freeze({
    documentName: documents[0].documentName,
    isTemplate: documents[0].isTemplate,
  });

  test.each([[document]])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // Document name too short.
    [{ ...document, documentName: '' }],
    // Missing document name.
    [{ isTemplate: document.isTemplate }],
    // Wrong data type for template boolean.
    [{ ...document, isTemplate: 'true' }],
    // Missing template boolean.
    // [{ documentName: document.documentName }],
    // Missing everything.
    [{}],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
