'use strict';

const db = require('../database/db');
const Document_X_Education = require('./document_x_education');

const {
  AppServerError,
  NotFoundError,
  BadRequestError,
} = require('../errors/appErrors');

const Document = require('./document');
const Education = require('./education');
const User = require('./user');
const {
  users,
  documents,
  educations,
  documents_x_educations,
} = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

describe('Document_X_Education', () => {
  // To help with expects by directly getting data from the database.
  const sqlTextSelectAll = `
  SELECT ${Document_X_Education._allDbColsAsJs}
  FROM ${Document_X_Education.tableName}`;

  const documentId = 1;

  beforeAll(() =>
    commonBeforeAll(db)
      .then(() =>
        db.query({
          queryConfig: {
            text: `
  INSERT INTO ${User.tableName}
  VALUES ($1, $2);`,
            values: [users[0].username, users[0].password],
          },
        })
      )
      .then(() =>
        db.query({
          queryConfig: {
            text: `
  INSERT INTO ${Document.tableName} (
    id,
    document_name,
    owner,
    is_master,
    is_template
  ) VALUES ($1, $2, $3, $4, $5);`,
            values: [
              documentId,
              documents[0].documentName,
              documents[0].owner,
              documents[0].isMaster,
              documents[0].isTemplate,
            ],
          },
        })
      )
      .then(() => {
        const insertData = educations.map((origEdu, idx) => {
          const edu = { id: idx + 1, ...origEdu };
          edu.gpa ||= null;
          edu.awardsAndHonors ||= null;
          edu.activities ||= null;

          return edu;
        });

        return db.query({
          queryConfig: {
            text: `
  INSERT INTO ${Education.tableName} (
    id,
    owner,
    school,
    location,
    start_date,
    end_date,
    degree,
    gpa,
    awards_and_honors,
    activities
  ) VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
    ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
            values: [
              ...Object.values(insertData[0]),
              ...Object.values(insertData[1]),
            ],
          },
        });
      })
  );

  beforeEach(() => clearTable(db, Document_X_Education.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- add

  describe('add', () => {
    const dataToAdd = documents_x_educations[0];

    test('Adds a new document_x_education.', async () => {
      // Act
      const instance = await Document_X_Education.add(dataToAdd);

      // Assert
      expect(instance).toBeInstanceOf(Document_X_Education);
      expect(instance).toEqual(dataToAdd);

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text:
              sqlTextSelectAll +
              '\n  WHERE document_id = $1 AND education_id = $2;',
            values: [dataToAdd.documentId, dataToAdd.educationId],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(dataToAdd);
    });

    test.each([
      ['document', { documentId: 999 }],
      ['education', { educationId: 999 }],
    ])(
      'Throws an Error if %s does not exist.',
      async (propertyName, nonexistentData) => {
        // Arrange
        const nonexistentRefData = {
          ...dataToAdd,
          ...nonexistentData,
        };

        // Act
        async function runFunc() {
          await Document_X_Education.add(nonexistentRefData);
        }

        // Assert
        await expect(runFunc).rejects.toThrow(NotFoundError);

        const databaseEntries = (
          await db.query({ queryConfig: { text: sqlTextSelectAll } })
        ).rows;

        // Ensure nothing gets added into database.
        expect(databaseEntries.length).toBe(0);
      }
    );

    test(
      'Throws an Error if adding a document_x_education ' +
        'with same position as another.',
      async () => {
        // Arrange
        const dataWithSamePosition = {
          ...dataToAdd,
          educationId: documents_x_educations[1].educationId,
        };

        await Document_X_Education.add(dataToAdd);

        // Act
        async function runFunc() {
          await Document_X_Education.add(dataWithSamePosition);
        }

        // Assert
        await expect(runFunc).rejects.toThrow();

        const databaseEntries = (
          await db.query({
            queryConfig: {
              text: sqlTextSelectAll + '\n  WHERE document_id = $1;',
              values: [documentId],
            },
          })
        ).rows;

        // Ensure existing data has not been modified.
        expect(databaseEntries.length).toBe(1);
        expect(databaseEntries[0]).toEqual(dataToAdd);
      }
    );
  });

  // -------------------------------------------------- getAll

  describe('getAll', () => {
    test.each([
      [0, [], []],
      [
        documents_x_educations.length,
        documents_x_educations,
        documents_x_educations,
      ],
    ])(
      'Get all of %i document_x_education(s) for a document.',
      async (amount, inputData, expected) => {
        // Arrange
        for (const props of inputData) {
          await Document_X_Education.add(props);
        }

        // Act
        const instances = await Document_X_Education.getAll(documentId);

        // Assert
        expect(instances.length).toBe(inputData.length);

        instances.forEach((instance, i) => {
          expect(instance).toBeInstanceOf(Document_X_Education);
          expect(instance).toEqual(expected[i]);
        });
      }
    );

    test('Get all documents_x_educations in the correct order.', async () => {
      const len = documents_x_educations.length;

      // Arrange
      // Change positions so that they are not sequential and are reversed.
      const modifiedDocuments_x_educations = Object.freeze(
        documents_x_educations.map((document_x_education, idx) => {
          return Object.freeze({
            ...document_x_education,
            position: len * (len - idx),
          });
        })
      );

      for (const props of modifiedDocuments_x_educations) {
        await Document_X_Education.add(props);
      }

      // Act
      const instances = await Document_X_Education.getAll(documentId);

      // Assert
      expect(instances).toEqual(modifiedDocuments_x_educations.toReversed());
    });
  });

  // -------------------------------------------------- get

  describe('get', () => {
    const existingData = documents_x_educations[0];

    test('Gets a specified document_x_education.', async () => {
      // Arrange
      await Document_X_Education.add(existingData);

      const queryParams = {
        documentId: existingData.documentId,
        educationId: existingData.educationId,
      };

      // Act
      const instance = await Document_X_Education.get(queryParams);

      // Assert
      expect(instance).toBeInstanceOf(Document_X_Education);
      expect(instance).toEqual(existingData);
    });

    test('Throws an Error if document_x_education is not found.', async () => {
      // Arrange
      const queryParams = { documentId: 999, educationId: 999 };

      // Act
      async function runFunc() {
        await Document_X_Education.get(queryParams);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------- update

  describe('update', () => {
    // Arrange
    const existingData = documents_x_educations[0];
    let preexistingInstance = null;

    beforeEach((done) => {
      Document_X_Education.add(existingData).then((instance) => {
        preexistingInstance = instance;
        done();
      });
    });

    afterEach(() => {
      preexistingInstance = null;
    });

    test('Updates a document_x_education.', async () => {
      // Arrange
      const newPosition = existingData.position + documents_x_educations.length;

      const expectedUpdatedData = {
        ...existingData,
        position: newPosition,
      };

      // Act
      const updatedInstance = await preexistingInstance.update(newPosition);

      // Assert
      expect(updatedInstance).toEqual(expectedUpdatedData);

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text:
              sqlTextSelectAll +
              '\n  WHERE document_id = $1 AND education_id = $2;',
            values: [
              preexistingInstance.documentId,
              preexistingInstance.educationId,
            ],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(expectedUpdatedData);
    });

    test('Throws an Error if position is invalid.', async () => {
      // Arrange
      const newPosition = -1;

      // Act
      async function runFunc() {
        await preexistingInstance.update(newPosition);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(BadRequestError);
    });

    test('Throws an Error if document_x_education is not found.', async () => {
      // Arrange
      const nonexistentInstance = new Document_X_Education(999, 999);

      // Act
      async function runFunc() {
        await nonexistentInstance.update(9);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(AppServerError);
    });
  });

  // -------------------------------------------------- delete

  describe('delete', () => {
    const existingData = documents_x_educations[0];

    test('Deletes a document_x_education.', async () => {
      // Arrange
      const instance = await Document_X_Education.add(existingData);

      // Act
      await Document_X_Education.delete(
        instance.documentId,
        instance.educationId
      );

      // Assert
      const databaseData = await db.query({
        queryConfig: {
          text:
            sqlTextSelectAll +
            '\n  WHERE document_id = $1 AND education_id = $2;',
          values: [instance.documentId, instance.educationId],
        },
      });

      expect(databaseData.rows.length).toBe(0);
    });

    test('Does not throw an Error if document_x_education is not found.', async () => {
      // Act
      await Document_X_Education.delete(999, 999);
    });
  });
});
