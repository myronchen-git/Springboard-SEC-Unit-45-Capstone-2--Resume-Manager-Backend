'use strict';

const db = require('../database/db');
const Experience_X_Text_Snippet = require('./experience_x_textSnippet');

const {
  AppServerError,
  NotFoundError,
  BadRequestError,
} = require('../errors/appErrors');

const Document = require('./document');
const Document_X_Experience = require('./document_x_experience');
const Experience = require('./experience');
const TextSnippet = require('./textSnippet');
const User = require('./user');
const {
  users,
  documents,
  textSnippets,
  versions,
  experiences,
  documents_x_experiences,
  experiences_x_text_snippets,
} = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

describe('Experience_X_Text_Snippet', () => {
  // To help with expects by directly getting data from the database.
  const sqlTextSelectAll = `
  SELECT ${Experience_X_Text_Snippet._allDbColsAsJs}
  FROM ${Experience_X_Text_Snippet.tableName}`;

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
              1,
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
  ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
            values: [...Object.values(insertData[0])],
          },
        });
      })
      .then(() => {
        const insertData = documents_x_experiences.map((origData, idx) => ({
          id: idx + 1,
          ...origData,
        }));

        return db.query({
          queryConfig: {
            text: `
  INSERT INTO ${Document_X_Experience.tableName} (
    id,
    document_id,
    experience_id,
    position
  ) VALUES ($1, $2, $3, $4);`,
            values: [...Object.values(insertData[0])],
          },
        });
      })
      .then(() => {
        const insertData = textSnippets.map((origTextSnip, idx) => ({
          id: idx + 1,
          version: versions[idx],
          owner: origTextSnip.owner,
          parent: origTextSnip.parent || null,
          type: origTextSnip.type,
          content: origTextSnip.content,
        }));

        return db.query({
          queryConfig: {
            text: `
  INSERT INTO ${TextSnippet.tableName} (
    id,
    version,
    owner,
    parent,
    type,
    content
  ) VALUES
    ($1, $2, $3, $4, $5, $6),
    ($7, $8, $9, $10, $11, $12);`,
            values: [
              ...Object.values(insertData[0]),
              ...Object.values(insertData[1]),
            ],
          },
        });
      })
  );

  beforeEach(() => clearTable(db, Experience_X_Text_Snippet.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- add

  describe('add', () => {
    const dataToAdd = experiences_x_text_snippets[0];

    test('Adds a new experience_x_text_snippet.', async () => {
      // Act
      const instance = await Experience_X_Text_Snippet.add(dataToAdd);

      // Assert
      expect(instance).toBeInstanceOf(Experience_X_Text_Snippet);
      expect(instance).toEqual(dataToAdd);

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text:
              sqlTextSelectAll +
              '\n  WHERE document_x_experience_id = $1 AND text_snippet_id = $2;',
            values: [dataToAdd.documentXExperienceId, dataToAdd.textSnippetId],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(dataToAdd);
    });

    test.each([
      ['document', { documentXExperienceId: 999 }],
      ['text snippet', { textSnippetId: 999 }],
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
          await Experience_X_Text_Snippet.add(nonexistentRefData);
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
      'Throws an Error if adding a experience_x_text_snippet ' +
        'with same position as another.',
      async () => {
        // Arrange
        const dataWithSamePosition = {
          ...dataToAdd,
          textSnippetId: experiences_x_text_snippets[1].textSnippetId,
          textSnippetVersion: experiences_x_text_snippets[1].textSnippetVersion,
        };

        await Experience_X_Text_Snippet.add(dataToAdd);

        // Act
        async function runFunc() {
          await Experience_X_Text_Snippet.add(dataWithSamePosition);
        }

        // Assert
        await expect(runFunc).rejects.toThrow();

        const databaseEntries = (
          await db.query({
            queryConfig: {
              text:
                sqlTextSelectAll + '\n  WHERE document_x_experience_id = $1;',
              values: [dataToAdd.documentXExperienceId],
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
        experiences_x_text_snippets.length,
        experiences_x_text_snippets,
        experiences_x_text_snippets,
      ],
    ])(
      'Get all of %i experience_x_text_snippet(s) for a document.',
      async (amount, inputData, expected) => {
        // Arrange
        for (const props of inputData) {
          await Experience_X_Text_Snippet.add(props);
        }

        // Act
        const instances = await Experience_X_Text_Snippet.getAll(
          experiences_x_text_snippets[0].documentXExperienceId
        );

        // Assert
        expect(instances.length).toBe(inputData.length);

        instances.forEach((instance, i) => {
          expect(instance).toBeInstanceOf(Experience_X_Text_Snippet);
          expect(instance).toEqual(expected[i]);
        });
      }
    );

    test('Get all experiences_x_text_snippets in the correct order.', async () => {
      const len = experiences_x_text_snippets.length;

      // Arrange
      // Change positions so that they are not sequential and are reversed.
      const modifiedExperiences_x_text_snippets = Object.freeze(
        experiences_x_text_snippets.map((experience_x_text_snippet, idx) => {
          return Object.freeze({
            ...experience_x_text_snippet,
            position: len * (len - idx),
          });
        })
      );

      for (const props of modifiedExperiences_x_text_snippets) {
        await Experience_X_Text_Snippet.add(props);
      }

      // Act
      const instances = await Experience_X_Text_Snippet.getAll(
        experiences_x_text_snippets[0].documentXExperienceId
      );

      // Assert
      expect(instances).toEqual(
        modifiedExperiences_x_text_snippets.toReversed()
      );
    });
  });

  // -------------------------------------------------- get

  describe('get', () => {
    const existingData = experiences_x_text_snippets[0];

    test('Gets a specified experience_x_text_snippet.', async () => {
      // Arrange
      await Experience_X_Text_Snippet.add(existingData);

      const queryParams = {
        documentXExperienceId: existingData.documentXExperienceId,
        textSnippetId: existingData.textSnippetId,
      };

      // Act
      const instance = await Experience_X_Text_Snippet.get(queryParams);

      // Assert
      expect(instance).toBeInstanceOf(Experience_X_Text_Snippet);
      expect(instance).toEqual(existingData);
    });

    test('Throws an Error if experience_x_text_snippet is not found.', async () => {
      // Arrange
      const queryParams = { documentXExperienceId: 999, textSnippetId: 999 };

      // Act
      async function runFunc() {
        await Experience_X_Text_Snippet.get(queryParams);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------- update

  describe('update', () => {
    // Arrange
    const existingData = experiences_x_text_snippets[0];
    let preexistingInstance = null;

    beforeEach((done) => {
      Experience_X_Text_Snippet.add(existingData).then((instance) => {
        preexistingInstance = instance;
        done();
      });
    });

    afterEach(() => {
      preexistingInstance = null;
    });

    test('Updates a experience_x_text_snippet.', async () => {
      // Arrange
      const newPosition =
        existingData.position + experiences_x_text_snippets.length;

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
              '\n  WHERE document_x_experience_id = $1 AND text_snippet_id = $2;',
            values: [
              preexistingInstance.documentXExperienceId,
              preexistingInstance.textSnippetId,
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

    test('Throws an Error if experience_x_text_snippet is not found.', async () => {
      // Arrange
      const nonexistentInstance = new Experience_X_Text_Snippet(999, 999);

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
    const existingData = experiences_x_text_snippets[0];

    test('Deletes a experience_x_text_snippet.', async () => {
      // Arrange
      const instance = await Experience_X_Text_Snippet.add(existingData);

      // Act
      await Experience_X_Text_Snippet.delete(
        instance.documentXExperienceId,
        instance.textSnippetId
      );

      // Assert
      const databaseData = await db.query({
        queryConfig: {
          text:
            sqlTextSelectAll +
            '\n  WHERE document_x_experience_id = $1 AND text_snippet_id = $2;',
          values: [instance.documentXExperienceId, instance.textSnippetId],
        },
      });

      expect(databaseData.rows.length).toBe(0);
    });

    test('Does not throw an Error if experience_x_text_snippet is not found.', async () => {
      // Act
      await Experience_X_Text_Snippet.delete(999, 999);
    });
  });
});
