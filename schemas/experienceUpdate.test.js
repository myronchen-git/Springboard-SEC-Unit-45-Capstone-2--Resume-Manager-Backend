'use strict';

const jsonschema = require('jsonschema');

const schema = require('./experienceUpdate.json');

const { experiences } = require('../_testData');

// ==================================================

describe('experienceUpdate', () => {
  const { owner: _, ...experience } = experiences[1];
  Object.freeze(experience);

  test.each([
    // Put each property in contactInfo into its own test.
    ...Object.entries(experience).map((prop) => [Object.fromEntries([prop])]),
    // Contains all properties at once.
    [experience],
    // Empty Strings for optional properties.
    [{ ...experience, endDate: '' }],
  ])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // Title name too short.
    [{ ...experience, title: 'A' }],
    // Title name too long.
    [{ ...experience, title: 'A'.repeat(501) }],
    // Organization name too short.
    [{ ...experience, organization: 'A' }],
    // Organization name too long.
    [{ ...experience, organization: 'A'.repeat(501) }],
    // Location too short.
    [{ ...experience, location: 'A' }],
    // Location too long.
    [{ ...experience, location: 'A'.repeat(501) }],
    // startDate not correct format.
    [{ ...experience, startDate: '1-1-10' }],
    // startDate not correct format.
    [{ ...experience, startDate: '1-1-2010' }],
    // startDate not correct format.
    [{ ...experience, startDate: '13-13-2010' }],
    // startDate not correct format.
    [{ ...experience, startDate: '2010-20-12' }],
    // endDate not correct format.
    [{ ...experience, endDate: '1-1-10' }],
    // endDate not correct format.
    [{ ...experience, endDate: '1-1-2010' }],
    // endDate not correct format.
    [{ ...experience, endDate: '13-13-2010' }],
    // endDate not correct format.
    [{ ...experience, endDate: '2010-20-12' }],
    // Missing everything.
    [{}],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
