'use strict';

const db = require('../database/db');
const Document_X_Experience = require('./document_x_experience');

const {
  AppServerError,
  NotFoundError,
  BadRequestError,
} = require('../errors/appErrors');

const Document = require('./document');
const Experience = require('./experience');
const User = require('./user');
const {
  users,
  documents,
  experiences,
  documents_x_experiences,
} = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

describe('Document_X_Experience', () => {
  // To help with expects by directly getting data from the database.
  const sqlTextSelectAll = `
  SELECT ${Document_X_Experience._allDbColsAsJs}
  FROM ${Document_X_Experience.tableName}`;

  const documentId = 1;

  const expectedInstances = documents_x_experiences.map(
    (document_x_experience) => ({
      id: expect.any(Number),
      ...document_x_experience,
    })
  );

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
        const insertData = experiences.map((origExp, idx) => {
          const exp = { id: idx + 1, ...origExp };
          exp.endDate ||= null;

          return exp;
        });

        return db.query({
          queryConfig: {
            text: `
  INSERT INTO ${Experience.tableName} (
    id,
    owner,
    title,
    organization,
    location,
    start_date,
    end_date
  ) VALUES
    ($1, $2, $3, $4, $5, $6, $7),
    ($8, $9, $10, $11, $12, $13, $14);`,
            values: [
              ...Object.values(insertData[0]),
              ...Object.values(insertData[1]),
            ],
          },
        });
      })
  );

  beforeEach(() => clearTable(db, Document_X_Experience.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- add

  describe('add', () => {
    const dataToAdd = documents_x_experiences[0];
    const expectedInstance = expectedInstances[0];

    test('Adds a new document_x_experience.', async () => {
      // Act
      const instance = await Document_X_Experience.add(dataToAdd);

      // Assert
      expect(instance).toBeInstanceOf(Document_X_Experience);
      expect(instance).toEqual(expectedInstance);

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text:
              sqlTextSelectAll +
              '\n  WHERE document_id = $1 AND experience_id = $2;',
            values: [dataToAdd.documentId, dataToAdd.experienceId],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(expectedInstance);
    });

    test.each([
      ['document', { documentId: 999 }],
      ['experience', { experienceId: 999 }],
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
          await Document_X_Experience.add(nonexistentRefData);
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
      'Throws an Error if adding a document_x_experience ' +
        'with same position as another.',
      async () => {
        // Arrange
        const dataWithSamePosition = {
          ...dataToAdd,
          experienceId: documents_x_experiences[1].experienceId,
        };

        await Document_X_Experience.add(dataToAdd);

        // Act
        async function runFunc() {
          await Document_X_Experience.add(dataWithSamePosition);
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
        expect(databaseEntries[0]).toEqual(expectedInstance);
      }
    );
  });

  // -------------------------------------------------- getAll

  describe('getAll', () => {
    test.each([
      [0, [], []],
      [
        documents_x_experiences.length,
        documents_x_experiences,
        expectedInstances,
      ],
    ])(
      'Get all of %i document_x_experience(s) for a document.',
      async (amount, inputData, expected) => {
        // Arrange
        for (const props of inputData) {
          await Document_X_Experience.add(props);
        }

        // Act
        const instances = await Document_X_Experience.getAll(documentId);

        // Assert
        expect(instances.length).toBe(inputData.length);

        instances.forEach((instance, i) => {
          expect(instance).toBeInstanceOf(Document_X_Experience);
          expect(instance).toEqual(expected[i]);
        });
      }
    );

    test('Get all documents_x_experiences in the correct order.', async () => {
      const len = documents_x_experiences.length;

      // Arrange
      // Change positions so that they are not sequential and are reversed.
      const modifiedDocuments_x_experiences = documents_x_experiences.map(
        (document_x_experience, idx) => {
          return {
            ...document_x_experience,
            position: len * (len - idx),
          };
        }
      );
      for (const props of modifiedDocuments_x_experiences) {
        await Document_X_Experience.add(props);
      }

      // Act
      const instances = await Document_X_Experience.getAll(documentId);

      // Assert
      const expectedDocuments_x_experiences = modifiedDocuments_x_experiences
        .map((document_x_experience) => ({
          ...document_x_experience,
          id: expect.any(Number),
        }))
        .reverse();

      expect(instances).toEqual(expectedDocuments_x_experiences);
    });
  });

  // -------------------------------------------------- get

  describe('get', () => {
    const existingData = documents_x_experiences[0];
    const expectedInstance = expectedInstances[0];

    test('Gets a specified document_x_experience.', async () => {
      // Arrange
      await Document_X_Experience.add(existingData);

      const queryParams = {
        documentId: existingData.documentId,
        experienceId: existingData.experienceId,
      };

      // Act
      const instance = await Document_X_Experience.get(queryParams);

      // Assert
      expect(instance).toBeInstanceOf(Document_X_Experience);
      expect(instance).toEqual(expectedInstance);
    });

    test('Throws an Error if document_x_experience is not found.', async () => {
      // Arrange
      const queryParams = { documentId: 999, experienceId: 999 };

      // Act
      async function runFunc() {
        await Document_X_Experience.get(queryParams);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------- update

  describe('update', () => {
    // Arrange
    const existingData = documents_x_experiences[0];
    const expectedInstance = expectedInstances[0];

    let preexistingInstance = null;

    beforeEach((done) => {
      Document_X_Experience.add(existingData).then((instance) => {
        preexistingInstance = instance;
        done();
      });
    });

    afterEach(() => {
      preexistingInstance = null;
    });

    test('Updates a document_x_experience.', async () => {
      // Arrange
      const newPosition =
        existingData.position + documents_x_experiences.length;

      const expectedUpdatedData = {
        ...expectedInstance,
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
              '\n  WHERE document_id = $1 AND experience_id = $2;',
            values: [
              preexistingInstance.documentId,
              preexistingInstance.experienceId,
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

    test('Throws an Error if document_x_experience is not found.', async () => {
      // Arrange
      const nonexistentInstance = new Document_X_Experience(999, 999, 999);

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
    const existingData = documents_x_experiences[0];

    test('Deletes a document_x_experience.', async () => {
      // Arrange
      const instance = await Document_X_Experience.add(existingData);

      // Act
      await Document_X_Experience.delete(
        instance.documentId,
        instance.experienceId
      );

      // Assert
      const databaseData = await db.query({
        queryConfig: {
          text:
            sqlTextSelectAll +
            '\n  WHERE document_id = $1 AND experience_id = $2;',
          values: [instance.documentId, instance.experienceId],
        },
      });

      expect(databaseData.rows.length).toBe(0);
    });

    test('Does not throw an Error if document_x_experience is not found.', async () => {
      // Act
      await Document_X_Experience.delete(999, 999, 999);
    });
  });
});
