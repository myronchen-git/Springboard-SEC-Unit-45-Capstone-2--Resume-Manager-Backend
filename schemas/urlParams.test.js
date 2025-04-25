'use strict';

const jsonschema = require('jsonschema');

const schema = require('./urlParams.json');

// ==================================================

describe('urlParams', () => {
  const urlParameters = Object.freeze([
    'documentId',
    'sectionId',
    'educationId',
    'experienceId',
    'textSnippetId',
  ]);

  test.each([
    // Testing each parameter separately.
    ...urlParameters.map((param) => [{ [param]: '1' }]),
    // Multiple parameters at once.
    [{ documentId: '1', educationId: '1' }],
  ])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // Testing each parameter separately.
    ...urlParameters.map((param) => [{ [param]: 'a' }]),
    // Multiple parameters at once.
    [{ documentId: '1', educationId: 'abc' }],
    // Wrong type.
    [{ documentId: '1.1' }],
    // Wrong type.
    [{ documentId: '1-1' }],
    // Wrong type.
    [{ documentId: 'document-1' }],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
