'use strict';

const jsonschema = require('jsonschema');

const schema = require('./textSnippetUpdate.json');

const { textSnippets } = require('../_testData');

// ==================================================

describe('textSnippetUpdate', () => {
  const { owner: _, ...textSnippet } = textSnippets[0];
  Object.freeze(textSnippet);

  test.each([
    // Put each property in contactInfo into its own test.
    ...Object.entries(textSnippet).map((prop) => [Object.fromEntries([prop])]),
    // Contains all properties at once.
    [textSnippet],
  ])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // Content too short.
    [{ ...textSnippet, content: 'aaaa' }],
    // Missing everything.
    [{}],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
