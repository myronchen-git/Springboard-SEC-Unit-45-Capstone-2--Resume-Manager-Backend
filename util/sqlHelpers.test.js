'use strict';

const {
  convertPropsForSqlUpdate,
  convertPropsForSqlWhereClause,
} = require('./sqlHelpers');

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

describe('convertPropsForSqlWhereClause', () => {
  test.each([
    [
      { t: { owner: 'user1' }, dxe: { documentId: 1, experienceId: 2 } },
      [
        't.owner = $1 AND dxe.document_id = $2 AND dxe.experience_id = $3',
        ['user1', 1, 2],
      ],
    ],
    [
      { t: { owner: 'user1' }, dxe: { experienceId: 1 } },
      ['t.owner = $1 AND dxe.experience_id = $2', ['user1', 1]],
    ],
    [{ t: { owner: 'user1' }, dxe: {} }, ['t.owner = $1', ['user1']]],
    [{}, ['', []]],
  ])(
    'Outputs SQL WHERE clause substring and values; case %#.',
    (props, expectedOutput) => {
      // Act
      const output = convertPropsForSqlWhereClause(props);

      // Assert
      expect(output).toEqual(expectedOutput);
    }
  );
});
