'use strict';

const { convertDateToString } = require('./modelHelpers');

// ==================================================

describe('convertDateToString', () => {
  test.each([
    [new Date(2000, 0, 1), '2000-01-01'],
    [new Date(1999, 11, 31), '1999-12-31'],
  ])('Converts a Date into a date String.', (date, expectedDateString) => {
    // Act
    const dateString = convertDateToString(date);

    // Assert
    expect(dateString).toBe(expectedDateString);
  });

  test('Returns null if given null', () => {
    // Act
    const dateString = convertDateToString(null);

    // Assert
    expect(dateString).toBeNull();
  });
});
