'use strict';

const db = require('../database/db');
const Document_X_Skill = require('./document_x_skill');

const { NotFoundError } = require('../errors/appErrors');

const Document = require('./document');
const Skill = require('./skill');
const TextSnippet = require('./textSnippet');
const User = require('./user');
const {
  users,
  documents,
  textSnippets,
  skills,
  documents_x_skills,
} = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

describe('Document_X_Skill', () => {
  // To help with expects by directly getting data from the database.
  const sqlTextSelectAll = `
  SELECT ${Document_X_Skill._allDbColsAsJs}
  FROM ${Document_X_Skill.tableName}`;

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
        const insertData = textSnippets.map((origText, idx) => ({
          id: idx + 1,
          version: new Date(2000 + idx, 0, 1),
          owner: origText.owner,
          parent: origText.parent || null,
          type: origText.type,
          content: origText.content,
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
    ($7, $8, $9, $10, $11, $12)
  RETURNING id, version;`,
            values: [
              ...Object.values(insertData[0]),
              ...Object.values(insertData[1]),
            ],
          },
        });
      })
      .then((textSnippetInsertResult) => {
        const textSnippetData = textSnippetInsertResult.rows.map((row) => ({
          textSnippetId: row.id,
          textSnippetVersion: row.version,
        }));

        const insertData = skills.map((origSkill, idx) => ({
          id: idx + 1,
          ...origSkill,
          ...textSnippetData[idx],
        }));

        return db.query({
          queryConfig: {
            text: `
  INSERT INTO ${Skill.tableName} (
    id,
    name,
    owner,
    text_snippet_id,
    text_snippet_version
  ) VALUES
    ($1, $2, $3, $4, $5),
    ($6, $7, $8, $9, $10);`,
            values: [
              ...Object.values(insertData[0]),
              ...Object.values(insertData[1]),
            ],
          },
        });
      })
  );

  beforeEach(() => clearTable(db, Document_X_Skill.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- add

  describe('add', () => {
    const dataToAdd = documents_x_skills[0];

    test('Adds a new document_x_skill.', async () => {
      // Act
      const instance = await Document_X_Skill.add(dataToAdd);

      // Assert
      expect(instance).toBeInstanceOf(Document_X_Skill);
      expect(instance).toEqual(dataToAdd);

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text:
              sqlTextSelectAll +
              '\n  WHERE document_id = $1 AND skill_id = $2;',
            values: [dataToAdd.documentId, dataToAdd.skillId],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(dataToAdd);
    });

    test.each([
      ['document', { documentId: 999 }],
      ['skill', { skillId: 999 }],
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
          await Document_X_Skill.add(nonexistentRefData);
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
  });

  // -------------------------------------------------- getAll

  describe('getAll', () => {
    test.each([
      [0, [], []],
      [documents_x_skills.length, documents_x_skills, documents_x_skills],
    ])(
      'Get all of %i document_x_skill(s) for a document.',
      async (amount, inputData, expected) => {
        // Arrange
        for (const props of inputData) {
          await Document_X_Skill.add(props);
        }

        // Act
        const instances = await Document_X_Skill.getAll(documentId);

        // Assert
        expect(instances.length).toBe(inputData.length);

        instances.forEach((instance, i) => {
          expect(instance).toBeInstanceOf(Document_X_Skill);
          expect(instance).toEqual(expected[i]);
        });
      }
    );
  });

  // -------------------------------------------------- get

  describe('get', () => {
    const existingData = documents_x_skills[0];

    test('Gets a specified document_x_skill.', async () => {
      // Arrange
      await Document_X_Skill.add(existingData);

      const queryParams = {
        documentId: existingData.documentId,
        skillId: existingData.skillId,
      };

      // Act
      const instance = await Document_X_Skill.get(queryParams);

      // Assert
      expect(instance).toBeInstanceOf(Document_X_Skill);
      expect(instance).toEqual(existingData);
    });

    test('Throws an Error if document_x_skill is not found.', async () => {
      // Arrange
      const queryParams = { documentId: 999, skillId: 999 };

      // Act
      async function runFunc() {
        await Document_X_Skill.get(queryParams);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------- delete

  describe('delete', () => {
    const existingData = documents_x_skills[0];

    test('Deletes a document_x_skill.', async () => {
      // Arrange
      const instance = await Document_X_Skill.add(existingData);

      // Act
      await Document_X_Skill.delete(instance.documentId, instance.skillId);

      // Assert
      const databaseData = await db.query({
        queryConfig: {
          text:
            sqlTextSelectAll + '\n  WHERE document_id = $1 AND skill_id = $2;',
          values: [instance.documentId, instance.skillId],
        },
      });

      expect(databaseData.rows.length).toBe(0);
    });

    test('Does not throw an Error if document_x_skill is not found.', async () => {
      // Act
      await Document_X_Skill.delete(999, 999);
    });
  });
});
