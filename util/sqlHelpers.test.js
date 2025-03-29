'use strict';

const { convertPropsForSqlUpdate } = require('./sqlHelpers');

// ==================================================

describe('convertPropsForSqlUpdate', () => {
  test.each([
    [
      { documentName: 'New Name', isMaster: false },
      ['\n    document_name = $1,\n    is_master = $2,', ['New Name', false]],
    ],
    [{}, ['', []]],
  ])('Outputs SQL substring and values; case %#.', (props, expectedOutput) => {
    // Act
    const output = convertPropsForSqlUpdate(props);

    // Assert
    expect(output).toEqual(expectedOutput);
  });
});
