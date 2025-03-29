'use strict';

const db = require('../database/db');
const TextSnippet = require('./textSnippet');

const User = require('./user');
const { users } = require('../_testData');
const {
  dataForNewInstances,
  dataForUpdate,
  whereClauseToGetAll,
} = require('./_textSnippetTestData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ================================================== Set Up Variables

const ClassRef = TextSnippet;
const className = 'TextSnippet';

// ================================================== Specific Tests

describe(className, () => {
  // To help with expects by directly getting data from the database.
  const sqlTextSelectAll = `
  SELECT ${ClassRef._allDbColsAsJs}
  FROM ${TextSnippet.tableName}`;

  beforeAll(() =>
    commonBeforeAll(db).then(() =>
      db.query({
        queryConfig: {
          text: `
  INSERT INTO ${User.tableName}
  VALUES ($1, $2);`,
          values: [users[0].username, users[0].password],
        },
      })
    )
  );

  beforeEach(() => clearTable(db, TextSnippet.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- delete

  describe('delete', () => {
    test(
      'Deleting an old version of a snippet should only set the new ' +
        "versions' parent property to null.",
      async () => {
        // Arrange
        const oldTextSnippet = await ClassRef.add(dataForNewInstances[0]);
        const newTextSnippet = await oldTextSnippet.update(dataForUpdate[0]);

        newTextSnippet.parent = null;

        // Act
        await oldTextSnippet.delete();

        // Assert
        const databaseEntries = (
          await db.query({
            queryConfig: {
              text: sqlTextSelectAll + `\n  ${whereClauseToGetAll};`,
              values: [users[0].username],
            },
          })
        ).rows;

        expect(databaseEntries.length).toBe(1);
        expect(databaseEntries[0]).toEqual(newTextSnippet);
      }
    );
  });
});
