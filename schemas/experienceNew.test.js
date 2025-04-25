'use strict';

const jsonschema = require('jsonschema');

const schema = require('./experienceNew.json');

const { experiences } = require('../_testData');

// ==================================================

describe('experienceNew', () => {
  // Ensure first experience item only contains required properties and second
  // item contains both required and all optional properties.
  const experiencesData = Object.freeze(
    experiences.map((experience) => {
      const { owner, ...edu } = experience;
      return Object.freeze(edu);
    })
  );

  test.each(experiencesData.map((experience) => [experience]))(
    'Success for input %s',
    (str) => {
      // Act
      const result = jsonschema.validate(str, schema);

      // Assert
      expect(result.valid).toBeTruthy();
    }
  );

  test.each([
    // Title name too short.
    [{ ...experiencesData[0], title: 'A' }],
    // Title name too long.
    [{ ...experiencesData[0], title: 'A'.repeat(501) }],
    // Organization name too short.
    [{ ...experiencesData[0], organization: 'A' }],
    // Organization name too long.
    [{ ...experiencesData[0], organization: 'A'.repeat(501) }],
    // Location too short.
    [{ ...experiencesData[0], location: 'A' }],
    // Location too long.
    [{ ...experiencesData[0], location: 'A'.repeat(501) }],
    // startDate not correct format.
    [{ ...experiencesData[0], startDate: '1-1-10' }],
    // startDate not correct format.
    [{ ...experiencesData[0], startDate: '1-1-2010' }],
    // startDate not correct format.
    [{ ...experiencesData[0], startDate: '13-13-2010' }],
    // startDate not correct format.
    [{ ...experiencesData[0], startDate: '2010-20-12' }],
    // endDate not correct format.
    [{ ...experiencesData[1], endDate: '1-1-10' }],
    // endDate not correct format.
    [{ ...experiencesData[1], endDate: '1-1-2010' }],
    // endDate not correct format.
    [{ ...experiencesData[1], endDate: '13-13-2010' }],
    // endDate not correct format.
    [{ ...experiencesData[1], endDate: '2010-20-12' }],
    // Missing each required property.
    ...Object.keys(experiencesData[0]).map((prop) => {
      const educationCopy = { ...experiencesData[0] };
      delete educationCopy[prop];
      return [educationCopy];
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
