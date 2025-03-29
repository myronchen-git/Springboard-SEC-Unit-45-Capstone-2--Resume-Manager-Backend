'use strict';

const db = require('../database/db');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const User = require('./user');
const { users } = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');
const { convertDateToString } = require('../util/modelHelpers');

// ==================================================

/**
 * Runs standard tests for create, read, update, and delete operations.  Uses
 * first item of lists for certain operations, such as the first user for the
 * primary user and first entity's data as the primary entity for GET and UPDATE
 * operations.
 *
 * @param {Object} testConfig - Contains various names, text, data, etc for
 *  testing a model.
 * @param {Class} testConfig.class - Reference to the class.
 * @param {String} testConfig.tableName - Name of the table that the class is a
 *  model of.
 * @param {Boolean} testConfig.hasOwner - If the table has the attribute
 *  "owner".
 * @param {Object[]} testConfig.dataForNewInstances - Data for creating new
 *  records/entries.
 * @param {Object[]} testConfig.dataForDuplicationCheck - Similar data of the
 *  ones for creating new entries.  These are used for checking the adding of
 *  same names or info.
 * @param {Object[]} testConfig.dataForUpdate - Data used to update existing
 *  data.
 * @param {Object[]} testConfig.expectedDataInNewInstances - Expected data for
 *  every entry after doing operations.
 * @param {String} testConfig.whereClauseToGetOne - SQL WHERE statement and
 *  filter that can be used in SQL statements to retrieve a specific entry.
 * @param {String} testConfig.whereClauseToGetAll - SQL WHERE statement and
 *  filter that can be used in SQL statements to retrieve all related entries.
 * @param {Boolean} testConfig.runGetAllTests - Whether to run tests for the
 *  getAll method.
 * @param {Boolean} testConfig.runGetTests - Whether to run tests for the get
 *  method.
 * @param {Array} testConfig.testCasesForGet - The test cases for the get test
 *  that tests for success.
 *
 *  [[type, queryParams, expected], ...]
 *
 *  {String} type  - Signifies what is being searched for.
 *
 *  {Object} queryParams - The filters used to find a specific entry.
 *
 *  {Object} expected - Contains the expected data of the specific entry.
 */
function runCommonTests(testConfig) {
  const ClassRef = testConfig.class;
  const className = testConfig.class.name;
  const classNameLowerCase = className.toLowerCase();

  const {
    tableName,
    hasOwner = true,
    dataForNewInstances,
    dataForDuplicationCheck,
    dataForUpdate,
    expectedDataInNewInstances,
    whereClauseToGetOne,
    whereClauseToGetAll,
    runGetAllTests = true,
    runGetTests = true,
    testCasesForGet,
  } = testConfig;

  describe(className, () => {
    // To help with expects by directly getting data from the database.
    const sqlTextSelectAll = `
  SELECT ${ClassRef._allDbColsAsJs}
  FROM ${tableName}`;

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

    beforeEach(() => clearTable(db, tableName));

    afterAll(() => commonAfterAll(db));

    // -------------------------------------------------- add

    describe('add', () => {
      // Arrange
      const newInstanceData = dataForNewInstances[0];
      const expectedInstanceData = expectedDataInNewInstances[0];

      test(`Adds a new ${classNameLowerCase}.`, async () => {
        // Act
        const instance = await ClassRef.add(newInstanceData);

        // Assert
        expect(instance).toBeInstanceOf(ClassRef);
        expect(instance).toEqual(expectedInstanceData);

        const databaseEntry = (
          await db.query({
            queryConfig: {
              text: sqlTextSelectAll + `\n  ${whereClauseToGetOne};`,
              values:
                className === 'TextSnippet'
                  ? [instance.id, instance.version]
                  : [instance.id],
            },
          })
        ).rows[0];

        convertDatabaseEntryDates(databaseEntry);
        expect(databaseEntry).toEqual(expectedInstanceData);
      });

      if (dataForDuplicationCheck) {
        test(
          `Throws an Error if adding a ${classNameLowerCase} ` +
            `with the same name as another.`,
          async () => {
            // Arrange
            await ClassRef.add(newInstanceData);
            const duplicateInstanceData = dataForDuplicationCheck[0];

            // Act
            async function runFunc() {
              await ClassRef.add(duplicateInstanceData);
            }

            // Assert
            await expect(runFunc).rejects.toThrow();

            // fragile query config; consider redoing because of values
            const databaseEntries = (
              await db.query({
                queryConfig: {
                  text: sqlTextSelectAll + `\n  ${whereClauseToGetAll};`,
                  values: whereClauseToGetAll ? [users[0].username] : [],
                },
              })
            ).rows;

            // Ensure existing data has not been modified.
            expect(databaseEntries.length).toBe(1);

            const databaseEntry = databaseEntries[0];

            convertDatabaseEntryDates(databaseEntry);
            expect(databaseEntry).toEqual(expectedInstanceData);
          }
        );
      }
    });

    // -------------------------------------------------- getAll

    if (runGetAllTests) {
      describe('getAll', () => {
        test.each([
          [0, [], []],
          [
            dataForNewInstances.length,
            dataForNewInstances,
            expectedDataInNewInstances,
          ],
        ])(
          `Get all of %i ${classNameLowerCase}(s)${
            hasOwner ? ' for a user' : ''
          }.`,
          async (amount, inputData, expected) => {
            // Arrange
            for (const props of inputData) {
              await ClassRef.add(props);
            }

            // Act
            const instances = await ClassRef.getAll(
              hasOwner ? users[0].username : undefined
            );

            // Assert
            expect(instances.length).toBe(inputData.length);

            instances.forEach((instance, i) => {
              expect(instance).toBeInstanceOf(ClassRef);
              expect(instance).toEqual(expected[i]);
            });
          }
        );
      });
    }

    // -------------------------------------------------- get

    if (runGetTests) {
      describe('get', () => {
        test.each(testCasesForGet)(
          `Gets a specified ${classNameLowerCase} by %s${
            hasOwner ? ' from a user' : ''
          }.`,
          async (type, queryParams, expected) => {
            // Arrange
            const preexistingInstance = await ClassRef.add(
              dataForNewInstances[0]
            );

            switch (type) {
              case 'ID & version':
                queryParams.version = preexistingInstance.version;
              case 'ID':
                queryParams.id = preexistingInstance.id;
            }

            Object.freeze(queryParams);

            // Act
            const instance = await ClassRef.get(queryParams);

            // Assert
            expect(instance).toBeInstanceOf(ClassRef);
            expect(instance).toEqual(expected);
          }
        );

        test(
          `Throws an Error if ${classNameLowerCase} ` + `is not found.`,
          async () => {
            // Arrange
            const queryParams = { id: 999 };

            // Act
            async function runFunc() {
              await ClassRef.get(queryParams);
            }

            // Assert
            await expect(runFunc).rejects.toThrow(NotFoundError);
          }
        );
      });
    }

    // -------------------------------------------------- update

    describe('update', () => {
      // Arrange
      let preexistingInstance = null;

      beforeEach((done) => {
        ClassRef.add(dataForNewInstances[0]).then((instance) => {
          preexistingInstance = instance;
          done();
        });
      });

      afterEach(() => {
        preexistingInstance = null;
      });

      test.each([
        [0, Object.freeze({})], // empty
        [
          1,
          Object.freeze(
            Object.fromEntries([Object.entries(dataForUpdate[0])[0]])
          ),
        ], // one
        [Object.keys(dataForUpdate[0]).length, dataForUpdate[0]], // all
        [
          Object.keys(dataForUpdate[0]).length + 1,
          Object.freeze({ ...dataForUpdate[0], isValidColumn: false }),
        ], // extra
      ])(
        `Updates a ${classNameLowerCase} with %s properties.`,
        async (amount, updatedData) => {
          // Arrange
          const expectedUpdatedInstance = {
            ...preexistingInstance,
            ...updatedData,
          };

          delete expectedUpdatedInstance.isValidColumn;

          // Specifically for documents.
          if (
            Object.keys(preexistingInstance).includes('lastUpdated') &&
            Object.keys(updatedData).length
          )
            expectedUpdatedInstance.lastUpdated = expect.any(Date);

          // Specifically for text snippets.
          if (
            Object.keys(preexistingInstance).includes('parent') &&
            Object.keys(updatedData).length
          ) {
            expectedUpdatedInstance.parent = expect.any(Date);
            expectedUpdatedInstance.version = expect.any(Date);
          }

          // Act
          const updatedInstance = await preexistingInstance.update(updatedData);

          // Assert
          expect(updatedInstance).toEqual(expectedUpdatedInstance);

          const databaseEntry = (
            await db.query({
              queryConfig: {
                text: sqlTextSelectAll + `\n  ${whereClauseToGetOne};`,
                values:
                  className === 'TextSnippet'
                    ? [preexistingInstance.id, updatedInstance.version]
                    : [preexistingInstance.id],
              },
            })
          ).rows[0];

          convertDatabaseEntryDates(databaseEntry);
          expect(databaseEntry).toEqual(expectedUpdatedInstance);
        }
      );

      test(
        `Throws an Error if ${classNameLowerCase} ` + `is not found.`,
        async () => {
          // Arrange
          const nonexistentInstance =
            className === 'TextSnippet'
              ? new ClassRef(999, new Date(2030, 0, 1))
              : new ClassRef(999);

          // Act
          async function runFunc() {
            await nonexistentInstance.update(dataForUpdate[0]);
          }

          // Assert
          await expect(runFunc).rejects.toThrow(AppServerError);
        }
      );
    });

    // -------------------------------------------------- delete

    describe('delete', () => {
      const props = dataForNewInstances[0];

      test(`Deletes a ${classNameLowerCase}.`, async () => {
        // Arrange
        const instance = await ClassRef.add(props);

        // Act
        await instance.delete();

        // Assert
        const databaseData = await db.query({
          queryConfig: {
            text: sqlTextSelectAll + `\n  ${whereClauseToGetOne};`,
            values:
              className === 'TextSnippet'
                ? [instance.id, instance.version]
                : [instance.id],
          },
        });

        expect(databaseData.rows.length).toBe(0);
      });

      test(
        `Does not throw an Error if ${classNameLowerCase} ` + `is not found.`,
        async () => {
          // Arrange
          const nonexistentInstance = new ClassRef(999);

          // Act
          await nonexistentInstance.delete();
        }
      );
    });
  });
}

// ==================================================

/**
 * Converts the Date Objects into Strings for a retrieved row from the database.
 * This looks for keys that contains the text "Date" for Objects to convert.
 * The passed-in Object is mutated.
 *
 * @param {Object} databaseEntry - Data from a row from the database.
 */
function convertDatabaseEntryDates(databaseEntry) {
  for (const [key, value] of Object.entries(databaseEntry)) {
    if (key.includes('Date')) {
      databaseEntry[key] = convertDateToString(value);
    }
  }
}

// ==================================================

module.exports = { runCommonTests };
