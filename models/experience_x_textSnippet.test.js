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
  experiences,
  documents_x_experiences,
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

  const existingDocumentXExperiences = [];
  const existingTextSnippets = [];
  const experienceXTextSnippetDatas = [];

  beforeAll(async () => {
    await commonBeforeAll(db);

    await User.register({
      username: users[0].username,
      password: users[0].password,
    });

    await Document.add(documents[0]);

    for (const experience of experiences) {
      await Experience.add(experience);
    }

    for (const document_x_experience of documents_x_experiences) {
      existingDocumentXExperiences.push(
        await Document_X_Experience.add(document_x_experience)
      );
    }

    for (const textSnippet of textSnippets) {
      existingTextSnippets.push(await TextSnippet.add(textSnippet));
    }

    for (let i = 0; i < existingDocumentXExperiences.length; i++) {
      experienceXTextSnippetDatas.push({
        // Have to have everything under one document_x_experience ID.
        documentXExperienceId: existingDocumentXExperiences[0].id,
        textSnippetId: existingTextSnippets[i].id,
        textSnippetVersion: existingTextSnippets[i].version,
        position: i,
      });
    }
  });

  beforeEach(() => clearTable(db, Experience_X_Text_Snippet.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- add

  describe('add', () => {
    let dataToAdd;

    beforeAll(() => {
      dataToAdd = experienceXTextSnippetDatas[0];
    });

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
      'Throws an Error if adding an experience_x_text_snippet ' +
        'with the same position as another.',
      async () => {
        // Arrange
        const dataWithSamePosition = {
          ...dataToAdd,
          textSnippetId: experienceXTextSnippetDatas[1].textSnippetId,
          textSnippetVersion: experienceXTextSnippetDatas[1].textSnippetVersion,
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
    let existingData;

    beforeAll(() => {
      existingData = experienceXTextSnippetDatas[0];
    });

    test(
      'Get all of 0 experience_x_text_snippet(s) ' + 'for a document.',
      async () => {
        // Arrange
        const inputData = [];
        const expected = [];

        for (const props of inputData) {
          await Experience_X_Text_Snippet.add(props);
        }

        // Act
        const instances = await Experience_X_Text_Snippet.getAll(
          existingData.documentXExperienceId
        );

        // Assert
        expect(instances.length).toBe(inputData.length);

        instances.forEach((instance, i) => {
          expect(instance).toBeInstanceOf(Experience_X_Text_Snippet);
          expect(instance).toEqual(expected[i]);
        });
      }
    );

    test(
      `Get all of ${documents_x_experiences.length} ` +
        `experience_x_text_snippet(s) for a document.`,
      async () => {
        // Arrange
        const inputData = experienceXTextSnippetDatas;
        const expected = experienceXTextSnippetDatas;

        for (const props of inputData) {
          await Experience_X_Text_Snippet.add(props);
        }

        // Act
        const instances = await Experience_X_Text_Snippet.getAll(
          existingData.documentXExperienceId
        );

        // Assert
        expect(instances.length).toBe(inputData.length);

        instances.forEach((instance, i) => {
          expect(instance).toBeInstanceOf(Experience_X_Text_Snippet);
          expect(instance).toEqual(expected[i]);
        });
      }
    );

    test(
      'Get all experiences_x_text_snippets ' + 'in the correct order.',
      async () => {
        const len = experienceXTextSnippetDatas.length;

        // Arrange
        // Change positions so that they are not sequential and are reversed.
        const modifiedExperiencesXTextSnippets = Object.freeze(
          experienceXTextSnippetDatas.map((experienceXTextSnippet, idx) => {
            return Object.freeze({
              ...experienceXTextSnippet,
              position: len * (len - idx),
            });
          })
        );

        for (const props of modifiedExperiencesXTextSnippets) {
          await Experience_X_Text_Snippet.add(props);
        }

        // Act
        const instances = await Experience_X_Text_Snippet.getAll(
          existingData.documentXExperienceId
        );

        // Assert
        expect(instances).toEqual(
          modifiedExperiencesXTextSnippets.toReversed()
        );
      }
    );
  });

  // -------------------------------------------------- get

  describe('get', () => {
    let existingData;

    beforeAll(() => {
      existingData = experienceXTextSnippetDatas[0];
    });

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
    let existingData;
    let preexistingInstance = null;

    beforeAll(() => {
      existingData = experienceXTextSnippetDatas[0];
    });

    beforeEach(async () => {
      preexistingInstance = await Experience_X_Text_Snippet.add(existingData);
    });

    afterEach(() => {
      preexistingInstance = null;
    });

    test('Updates a experience_x_text_snippet.', async () => {
      // Arrange
      const newPosition =
        existingData.position + experienceXTextSnippetDatas.length;

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

  // -------------------------------------------------- replaceTextSnippet

  describe('replaceTextSnippet', () => {
    let anotherDocument;
    let anotherDocumentXExperience;
    let oldTextSnippet;
    let updatedTextSnippet;

    beforeAll(async () => {
      anotherDocument = await Document.add({
        documentName: 'doc 100',
        owner: users[0].username,
        isMaster: false,
        isTemplate: false,
      });

      anotherDocumentXExperience = await Document_X_Experience.add({
        documentId: anotherDocument.id,
        experienceId: 1,
        position: 0,
      });

      oldTextSnippet = await TextSnippet.get({
        id: experienceXTextSnippetDatas[0].textSnippetId,
        version: experienceXTextSnippetDatas[0].textSnippetVersion,
      });

      updatedTextSnippet = await oldTextSnippet.update({
        content: 'new content',
      });
    });

    afterAll(async () => {
      await Document.delete(anotherDocument.id);
      await updatedTextSnippet.delete();
    });

    test('Replaces all text snippet versions in all experiences_x_text_snippets.', async () => {
      // Arrange
      const experienceXText_SnippetData = { ...experienceXTextSnippetDatas[0] };
      delete experienceXText_SnippetData.documentXExperienceId;

      const textSnippetId = experienceXText_SnippetData.textSnippetId;
      const oldTextSnippetVersion =
        experienceXText_SnippetData.textSnippetVersion;
      const newTextSnippetVersion = updatedTextSnippet.version;

      const documentXExperienceIds = [1, anotherDocumentXExperience.id];

      // Adding the same text snippet with ID 1 to different
      // documents_x_experiences.
      for (const documentXExperienceId of documentXExperienceIds) {
        await Experience_X_Text_Snippet.add({
          documentXExperienceId,
          ...experienceXText_SnippetData,
        });
      }

      // Act
      const amountReplaced = await Experience_X_Text_Snippet.replaceTextSnippet(
        textSnippetId,
        oldTextSnippetVersion,
        newTextSnippetVersion
      );

      // Assert
      expect(amountReplaced).toBe(documentXExperienceIds.length);

      // Have to get all entries, because there is no method to get entries
      // according to text snippet ID.
      const databaseEntries = (
        await db.query({
          queryConfig: { text: sqlTextSelectAll },
        })
      ).rows;

      expect(
        databaseEntries.every(
          (entry) =>
            entry.textSnippetVersion.getTime() ===
              updatedTextSnippet.version.getTime() && entry.position === 0
        )
      ).toBeTruthy();
    });

    test('Does not replace other text snippets of different IDs.', async () => {
      // There should only be one experience_x_text_snippet for the first text
      // snippet in textSnippets.

      // Arrange
      for (const experience_x_text_snippet of experienceXTextSnippetDatas) {
        await Experience_X_Text_Snippet.add(experience_x_text_snippet);
      }

      const textSnippetId = oldTextSnippet.id;
      const oldTextSnippetVersion = oldTextSnippet.version;
      const newTextSnippetVersion = updatedTextSnippet.version;

      // Act
      const amountReplaced = await Experience_X_Text_Snippet.replaceTextSnippet(
        textSnippetId,
        oldTextSnippetVersion,
        newTextSnippetVersion
      );

      // Assert
      expect(amountReplaced).toBe(1);

      // Have to get all entries, because there is no method to get entries
      // according to text snippet ID.
      const databaseEntries = (
        await db.query({
          queryConfig: { text: sqlTextSelectAll },
        })
      ).rows;

      // Check the updated experience_x_text_snippet.
      expect(databaseEntries.at(-1).textSnippetId).toBe(textSnippetId);
      expect(databaseEntries.at(-1).textSnippetVersion.getTime()).toBe(
        newTextSnippetVersion.getTime()
      );
      expect(databaseEntries.at(-1).position).toBe(0);

      // Check the rest of the experiences_x_text_snippets.
      for (let i = 0; i < databaseEntries.length - 1; i++) {
        expect(databaseEntries[i].textSnippetId).toBe(
          experienceXTextSnippetDatas[i + 1].textSnippetId
        );
        expect(databaseEntries[i].textSnippetVersion.getTime()).toBe(
          experienceXTextSnippetDatas[i + 1].textSnippetVersion.getTime()
        );
        expect(databaseEntries[i].position).toBe(i + 1);
      }
    });
  });

  // -------------------------------------------------- delete

  describe('delete', () => {
    let existingData;

    beforeAll(() => {
      existingData = experienceXTextSnippetDatas[0];
    });

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
