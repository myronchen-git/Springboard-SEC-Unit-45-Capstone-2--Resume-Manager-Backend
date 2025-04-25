'use strict';

const jsonschema = require('jsonschema');

const schema = require('./educationUpdate.json');

const { educations } = require('../_testData');

// ==================================================

describe('educationUpdate', () => {
  const { owner: _, ...education } = educations[1];
  Object.freeze(education);

  test.each([
    // Put each property in contactInfo into its own test.
    ...Object.entries(education).map((prop) => [Object.fromEntries([prop])]),
    // Contains all properties at once.
    [education],
    // Empty Strings for optional properties.
    [{ ...education, gpa: '', awardsAndHonors: '', activities: '' }],
  ])('Success for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeTruthy();
  });

  test.each([
    // School name too short.
    [{ ...education, school: 'A' }],
    // School name too long.
    [{ ...education, school: 'A'.repeat(501) }],
    // Location too short.
    [{ ...education, location: 'A' }],
    // Location too long.
    [{ ...education, location: 'A'.repeat(501) }],
    // startDate not correct format.
    [{ ...education, startDate: '1-1-10' }],
    // startDate not correct format.
    [{ ...education, startDate: '1-1-2010' }],
    // startDate not correct format.
    [{ ...education, startDate: '13-13-2010' }],
    // startDate not correct format.
    [{ ...education, startDate: '2010-20-12' }],
    // endDate not correct format.
    [{ ...education, endDate: '1-1-10' }],
    // endDate not correct format.
    [{ ...education, endDate: '1-1-2010' }],
    // endDate not correct format.
    [{ ...education, endDate: '13-13-2010' }],
    // endDate not correct format.
    [{ ...education, endDate: '2010-20-12' }],
    // Degree name too short.
    [{ ...education, degree: 'A' }],
    // Degree name too long.
    [{ ...education, degree: 'A'.repeat(201) }],
    // GPA length too long.
    [{ ...education, gpa: '1'.repeat(21) }],
    // Missing everything.
    [{}],
  ])('Failure for input %s', (str) => {
    // Act
    const result = jsonschema.validate(str, schema);

    // Assert
    expect(result.valid).toBeFalsy();
  });
});
