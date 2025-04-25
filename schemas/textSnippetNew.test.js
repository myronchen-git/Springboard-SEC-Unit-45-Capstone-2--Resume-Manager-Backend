'use strict';

const jsonschema = require('jsonschema');

const schema = require('./textSnippetNew.json');

const { textSnippets } = require('../_testData');

// ==================================================

describe('textSnippetNew', () => {
  const { owner: _, ...textSnippet } = textSnippets[0];
  Object.freeze(textSnippet);

  test.each([textSnippet])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // Content too short.
    [{ ...textSnippet, content: 'aaaa' }],
    // Missing each required property.
    ...Object.keys(textSnippet).map((prop) => {
      const textSnippetCopy = { ...textSnippet };
      delete textSnippetCopy[prop];
      return [textSnippetCopy];
    }),
    // Missing everything.
    [{}],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
