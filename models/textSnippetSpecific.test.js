'use strict';

const db = require('../database/db');
const Experience = require('./experience');
const Experience_X_Text_Snippet = require('./experience_x_textSnippet');
const Document = require('./document');
const Document_X_Experience = require('./document_x_experience');
const TextSnippet = require('./textSnippet');
const User = require('./user');

const {
  users,
  documents,
  experiences,
  documents_x_experiences,
  textSnippets,
} = require('../_testData');
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

// ================================================== Specific Tests

describe('TextSnippet', () => {
  // To help with expects by directly getting data from the database.
  const sqlTextSelectAll = `
  SELECT ${TextSnippet._allDbColsAsJs}
  FROM ${TextSnippet.tableName}`;

  beforeAll(async () => {
    await commonBeforeAll(db);

    await User.register(users[0]);
  });

  beforeEach(() => clearTable(db, TextSnippet.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- getAllForExperience

  describe('getAllForExperience', () => {
    let addedExperience;
    let addedDocumentXExperience;

    beforeAll(async () => {
      await Document.add(documents[0]);
      addedExperience = await Experience.add(experiences[0]);
      addedDocumentXExperience = await Document_X_Experience.add(
        documents_x_experiences[0]
      );
    });

    afterAll(async () => {
      await clearTable(db, Document.tableName);
      await clearTable(db, Experience.tableName);
    });

    test.each([
      [0, []],
      [textSnippets.length, textSnippets],
    ])(
      'Gets all %i text snippets for an experience.',
      async (_length, textSnippetsToAdd) => {
        // Arrange
        let nextPosition = 0;

        for (const textSnippetToAdd of textSnippetsToAdd) {
          const addedTextSnippet = await TextSnippet.add(textSnippetToAdd);
          await Experience_X_Text_Snippet.add({
            documentXExperienceId: addedDocumentXExperience.id,
            textSnippetId: addedTextSnippet.id,
            textSnippetVersion: addedTextSnippet.version,
            position: nextPosition++,
          });
        }

        // Act
        const textSnippets = await TextSnippet.getAllForExperience(
          users[0].username,
          addedExperience.id
        );

        // Assert
        const expectedTextSnippets = textSnippetsToAdd.map(
          (textSnippetToAdd) =>
            new TextSnippet(
              expect.any(Number),
              expect.any(Date),
              textSnippetToAdd.owner,
              null,
              textSnippetToAdd.type,
              textSnippetToAdd.content
            )
        );

        expect(textSnippets).toStrictEqual(expectedTextSnippets);
      }
    );
  });

  // -------------------------------------------------- getAllForExperience

  describe('getAllForExperienceInDocument', () => {
    let addedDocument;
    let addedExperience;
    let addedDocumentXExperience;

    beforeAll(async () => {
      addedDocument = await Document.add(documents[0]);
      await Document.add(documents[1]);
      addedExperience = await Experience.add(experiences[0]);
      await Experience.add(experiences[1]);
      addedDocumentXExperience = await Document_X_Experience.add(
        documents_x_experiences[0]
      );
      await Document_X_Experience.add(documents_x_experiences[1]);
    });

    afterAll(async () => {
      await clearTable(db, Document.tableName);
      await clearTable(db, Experience.tableName);
    });

    test.each([
      [0, []],
      [textSnippets.length, textSnippets],
    ])(
      'Gets all %i text snippets for an experience for a particular document.',
      async (_length, textSnippetsToAdd) => {
        // Arrange
        let nextPosition = 0;

        for (const textSnippetToAdd of textSnippetsToAdd) {
          const addedTextSnippet = await TextSnippet.add(textSnippetToAdd);
          await Experience_X_Text_Snippet.add({
            documentXExperienceId: addedDocumentXExperience.id,
            textSnippetId: addedTextSnippet.id,
            textSnippetVersion: addedTextSnippet.version,
            position: nextPosition++,
          });
        }

        // Act
        const textSnippets = await TextSnippet.getAllForExperienceInDocument(
          users[0].username,
          addedDocument.id,
          addedExperience.id
        );

        // Assert
        const expectedTextSnippets = textSnippetsToAdd.map(
          (textSnippetToAdd) =>
            new TextSnippet(
              expect.any(Number),
              expect.any(Date),
              textSnippetToAdd.owner,
              null,
              textSnippetToAdd.type,
              textSnippetToAdd.content
            )
        );

        expect(textSnippets).toStrictEqual(expectedTextSnippets);
      }
    );
  });

  // -------------------------------------------------- delete

  describe('delete', () => {
    test(
      'Deleting an old version of a snippet should only set the new ' +
        "versions' parent property to null.",
      async () => {
        // Arrange
        const oldTextSnippet = await TextSnippet.add(dataForNewInstances[0]);
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
