'use strict';

const jsonschema = require('jsonschema');

const schema = require('./educationNew.json');

const { educations } = require('../_testData');

// ==================================================

describe('educationNew', () => {
  // Ensure first education item only contains required properties and second
  // item contains both required and all optional properties.
  const educationsData = educations.map((education) => {
    const { owner, ...edu } = education;
    return edu;
  });

  test.each(educationsData.map((education) => [education]))(
    'Success for input %s',
    (str) => {
      // Act
      const result = jsonschema.validate(str, schema);

      // Assert
      expect(result.valid).toBeTruthy();
    }
  );

  test.each([
    // School name too short.
    [{ ...educationsData[0], school: 'A' }],
    // School name too long.
    [{ ...educationsData[0], school: 'A'.repeat(501) }],
    // Location too short.
    [{ ...educationsData[0], location: 'A' }],
    // Location too long.
    [{ ...educationsData[0], location: 'A'.repeat(501) }],
    // startDate not correct format.
    [{ ...educationsData[0], startDate: '1-1-10' }],
    // startDate not correct format.
    [{ ...educationsData[0], startDate: '1-1-2010' }],
    // startDate not correct format.
    [{ ...educationsData[0], startDate: '13-13-2010' }],
    // startDate not correct format.
    [{ ...educationsData[0], startDate: '2010-20-12' }],
    // endDate not correct format.
    [{ ...educationsData[0], endDate: '1-1-10' }],
    // endDate not correct format.
    [{ ...educationsData[0], endDate: '1-1-2010' }],
    // endDate not correct format.
    [{ ...educationsData[0], endDate: '13-13-2010' }],
    // endDate not correct format.
    [{ ...educationsData[0], endDate: '2010-20-12' }],
    // Degree name too short.
    [{ ...educationsData[0], degree: 'A' }],
    // Degree name too long.
    [{ ...educationsData[0], degree: 'A'.repeat(201) }],
    // GPA length too short.
    [{ ...educationsData[1], gpa: '1' }],
    // GPA length too long.
    [{ ...educationsData[1], gpa: '1'.repeat(21) }],
    // Awards and honors length too short.
    [{ ...educationsData[1], awardsAndHonors: 'A' }],
    // Activities length too short.
    [{ ...educationsData[1], activities: 'A' }],
    // Missing each required property.
    ...Object.keys(educationsData[0]).map((prop) => {
      const educationCopy = { ...educationsData[0] };
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
