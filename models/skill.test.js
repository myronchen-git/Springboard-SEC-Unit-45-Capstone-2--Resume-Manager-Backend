'use strict';

const db = require('../database/db');
const Skill = require('./skill');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const TextSnippet = require('./textSnippet');
const User = require('./user');
const { users, skills, textSnippets } = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

describe('Skill', () => {
  let textSnippetData;
  let newSkillData;
  let expectedSkillData;

  function getNewSkillData() {
    return newSkillData;
  }

  function getExpectedSkillData() {
    return expectedSkillData;
  }

  const sqlToGetById = `
  SELECT
    id,
    name,
    owner,
    text_snippet_id AS "textSnippetId",
    text_snippet_version AS "textSnippetVersion"
  FROM ${Skill.tableName}
  WHERE id = $1;`;

  const sqlToGetByOwner = `
  SELECT
    id,
    name,
    owner,
    text_snippet_id AS "textSnippetId",
    text_snippet_version AS "textSnippetVersion"
  FROM ${Skill.tableName}
  WHERE owner = $1;`;

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
  INSERT INTO ${TextSnippet.tableName} (owner, type, content)
  VALUES ($1, $2, $3)
  RETURNING id, version;`,
            values: [
              users[0].username,
              textSnippets[0].type,
              textSnippets[0].content,
            ],
          },
        })
      )
      .then((result) => {
        textSnippetData = {
          textSnippetId: result.rows[0].id,
          textSnippetVersion: result.rows[0].version,
        };

        newSkillData = skills.map((skill) =>
          Object.freeze({
            ...skill,
            ...textSnippetData,
          })
        );

        expectedSkillData = newSkillData.map((data) => ({
          id: expect.any(Number),
          ...data,
        }));
      })
  );

  beforeEach(() => clearTable(db, Skill.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- add

  describe('add', () => {
    test(`Adds a new skill.`, async () => {
      // Act
      const skill = await Skill.add(newSkillData[0]);

      // Assert
      expect(skill).toBeInstanceOf(Skill);
      expect(skill).toEqual(expectedSkillData[0]);

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text: sqlToGetById,
            values: [skill.id],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(expectedSkillData[0]);
    });

    test.each([
      ['owner', { owner: 'nonexistent' }],
      ['text snippet', { textSnippetId: 999, textSnippetVersion: new Date() }],
    ])(
      'Throws an Error if %s does not exist.',
      async (propertyName, nonexistentData) => {
        // Arrange
        const nonexistentRefData = { ...newSkillData[0], ...nonexistentData };

        // Act
        async function runFunc() {
          await Skill.add(nonexistentRefData);
        }

        // Assert
        await expect(runFunc).rejects.toThrow(NotFoundError);

        const databaseEntries = (
          await db.query({
            queryConfig: {
              text: sqlToGetByOwner,
              values: [users[0].username],
            },
          })
        ).rows;

        // Ensure nothing gets added into database.
        expect(databaseEntries.length).toBe(0);
      }
    );

    test(
      'Throws an Error if adding a skill ' + 'with the same name as another.',
      async () => {
        // Arrange
        await Skill.add(newSkillData[0]);

        // Act
        async function runFunc() {
          await Skill.add(newSkillData[0]);
        }

        // Assert
        await expect(runFunc).rejects.toThrow();

        const databaseEntries = (
          await db.query({
            queryConfig: {
              text: sqlToGetByOwner,
              values: [users[0].username],
            },
          })
        ).rows;

        // Ensure existing data has not been modified.
        expect(databaseEntries.length).toBe(1);
        expect(databaseEntries[0]).toEqual(expectedSkillData[0]);
      }
    );
  });

  // -------------------------------------------------- getAll

  describe('getAll', () => {
    // Have to use functions to get asynchronous data, because test info is run
    // before beforeAll block.  See https://github.com/jestjs/jest/issues/7100.
    test.each([
      [0, () => [], () => []],
      [skills.length, getNewSkillData, getExpectedSkillData],
    ])(
      'Get all of %i skill(s) for a user.',
      async (amount, inputDataFn, expectedFn) => {
        // Arrange
        for (const props of inputDataFn()) {
          await Skill.add(props);
        }

        const expected = expectedFn();

        // Act
        const skills = await Skill.getAll(users[0].username);

        // Assert
        expect(skills.length).toBe(amount);

        skills.forEach((skill, i) => {
          expect(skill).toBeInstanceOf(Skill);
          expect(skill).toEqual(expected[i]);
        });
      }
    );
  });

  // -------------------------------------------------- get

  describe('get', () => {
    // Have to use functions to get asynchronous data, because test info is run
    // before beforeAll block.  See https://github.com/jestjs/jest/issues/7100.
    test.each([
      ['ID', { owner: users[0].username }, getExpectedSkillData],
      [
        'ID',
        { name: skills[0].name, owner: users[0].username },
        getExpectedSkillData,
      ],
      [
        'name',
        { name: skills[0].name, owner: users[0].username },
        getExpectedSkillData,
      ],
    ])(
      'Gets a specified skill by %s from a user.',
      async (type, queryParams, expectedFn) => {
        // Arrange
        const preexistingInstance = await Skill.add(newSkillData[0]);

        if (type === 'ID') queryParams.id = preexistingInstance.id;
        Object.freeze(queryParams);

        const expected = expectedFn()[0];

        // Act
        const instance = await Skill.get(queryParams);

        // Assert
        expect(instance).toBeInstanceOf(Skill);
        expect(instance).toEqual(expected);
      }
    );

    test(`Throws an Error if skill is not found.`, async () => {
      // Arrange
      const queryParams = { id: 999 };

      // Act
      async function runFunc() {
        await Skill.get(queryParams);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------- update

  describe('update', () => {
    // Arrange
    let preexistingSkill = null;
    const dataForUpdate = { name: 'updated name' };

    beforeEach((done) => {
      Skill.add(newSkillData[0]).then((instance) => {
        preexistingSkill = instance;
        done();
      });
    });

    afterEach(() => {
      preexistingSkill = null;
    });

    test.each([
      [Object.keys(dataForUpdate).length, dataForUpdate], // all
    ])('Updates a skill with %s properties.', async (amount, updatedData) => {
      // Arrange
      const expectedUpdatedSkill = {
        ...preexistingSkill,
        ...updatedData,
      };

      delete expectedUpdatedSkill.isValidColumn;

      // Act
      const updatedSkill = await preexistingSkill.update(updatedData);

      // Assert
      expect(updatedSkill).toEqual(expectedUpdatedSkill);

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text: sqlToGetById,
            values: [preexistingSkill.id],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(expectedUpdatedSkill);
    });

    test('Throws an Error if skill is not found.', async () => {
      // Arrange
      const nonexistentSkill = new Skill(999);

      // Act
      async function runFunc() {
        await nonexistentSkill.update(dataForUpdate);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(AppServerError);
    });
  });

  // -------------------------------------------------- delete

  describe('delete', () => {
    test('Deletes a skill.', async () => {
      // Arrange
      const skill = await Skill.add(newSkillData[0]);

      // Act
      await skill.delete();

      // Assert
      const databaseEntries = (
        await db.query({
          queryConfig: {
            text: sqlToGetById,
            values: [skill.id],
          },
        })
      ).rows;

      expect(databaseEntries.length).toBe(0);
    });

    test('Does not throw an Error if skill is not found.', async () => {
      // Arrange
      const nonexistentInstance = new Skill(999);

      // Act
      await nonexistentInstance.delete();
    });
  });
});
