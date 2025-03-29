'use strict';

const db = require('../database/db');
const ContactInfo = require('./contactInfo');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const User = require('./user');
const { users, contactInfos: dataForNewInstances } = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

describe('ContactInfo', () => {
  // To help with expects by directly getting data from the database.
  const sqlTextSelectAll = `
  SELECT ${ContactInfo._allDbColsAsJs}
  FROM ${ContactInfo.tableName}`;

  const expectedDataInNewInstances = dataForNewInstances.map((data) => ({
    username: data.username,
    fullName: data.fullName,
    location: data.location || null,
    email: data.email || null,
    phone: data.phone || null,
    linkedin: data.linkedin || null,
    github: data.github || null,
  }));

  beforeAll(() =>
    commonBeforeAll(db).then(() =>
      db.query({
        queryConfig: {
          text: `
  INSERT INTO ${User.tableName}
  VALUES
    ($1, $2),
    ($3, $4);`,
          values: [
            users[0].username,
            users[0].password,
            users[1].username,
            users[1].password,
          ],
        },
      })
    )
  );

  beforeEach(() => clearTable(db, ContactInfo.tableName));

  afterAll(() => commonAfterAll(db));

  // -------------------------------------------------- add

  describe('add', () => {
    test.each(
      dataForNewInstances.map((contactInfo, idx) => [
        contactInfo,
        expectedDataInNewInstances[idx],
      ])
    )(
      'Adds a new contact info.',
      async (newInstanceData, expectedInstanceData) => {
        // Act
        const instance = await ContactInfo.add(newInstanceData);

        // Assert
        expect(instance).toBeInstanceOf(ContactInfo);
        expect(instance).toEqual(expectedInstanceData);

        const databaseEntry = (
          await db.query({
            queryConfig: {
              text: sqlTextSelectAll + '\n  WHERE username = $1;',
              values: [newInstanceData.username],
            },
          })
        ).rows[0];

        expect(databaseEntry).toEqual(expectedInstanceData);
      }
    );
  });

  // -------------------------------------------------- get

  describe('get', () => {
    const newInstanceData = dataForNewInstances[0];
    const expectedInstanceData = expectedDataInNewInstances[0];

    test('Gets a specified contact info by username.', async () => {
      // Arrange
      await ContactInfo.add(newInstanceData);
      const queryParams = { username: newInstanceData.username };

      // Act
      const instance = await ContactInfo.get(queryParams);

      // Assert
      expect(instance).toBeInstanceOf(ContactInfo);
      expect(instance).toEqual(expectedInstanceData);
    });

    test('Throws an Error if contact info is not found.', async () => {
      // Arrange
      const queryParams = { username: 'nonexistent' };

      // Act
      async function runFunc() {
        await ContactInfo.get(queryParams);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------- update

  describe('update', () => {
    // Arrange
    let preexistingInstance = null;

    const dataForUpdate = Object.freeze(
      dataForNewInstances.map((data) =>
        Object.freeze({
          fullName: 'Updated ' + data.fullName,
          location: 'Updated Location',
          email: 'Updated Email',
          phone: '000-000-0000',
          linkedin: 'updated@linkedin.com',
          github: 'updated@github.com',
        })
      )
    );

    beforeEach((done) => {
      ContactInfo.add(dataForNewInstances[0]).then((instance) => {
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
      'Updates a a contact info with %s properties.',
      async (amount, updatedData) => {
        // Arrange
        const expectedUpdatedInstance = {
          ...preexistingInstance,
          ...updatedData,
        };

        delete expectedUpdatedInstance.isValidColumn;

        // Act
        const updatedInstance = await preexistingInstance.update(updatedData);

        // Assert
        expect(updatedInstance).toEqual(expectedUpdatedInstance);

        const databaseEntry = (
          await db.query({
            queryConfig: {
              text: sqlTextSelectAll + '\n  WHERE username = $1;',
              values: [preexistingInstance.username],
            },
          })
        ).rows[0];

        expect(databaseEntry).toEqual(expectedUpdatedInstance);
      }
    );

    test('Throws an Error if contact info is not found.', async () => {
      // Arrange
      const nonexistentInstance = new ContactInfo('nonexistent');

      // Act
      async function runFunc() {
        await nonexistentInstance.update(dataForUpdate[0]);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(AppServerError);
    });
  });

  // -------------------------------------------------- delete

  describe('delete', () => {
    const props = dataForNewInstances[0];

    test('Deletes a contact info.', async () => {
      // Arrange
      const instance = await ContactInfo.add(props);

      // Act
      await instance.delete();

      // Assert
      const databaseData = await db.query({
        queryConfig: {
          text: sqlTextSelectAll + `\n  WHERE username = $1;`,
          values: [instance.username],
        },
      });

      expect(databaseData.rows.length).toBe(0);
    });

    test('Does not throw an Error if contact info is not found.', async () => {
      // Arrange
      const nonexistentInstance = new ContactInfo('nonexistent');

      // Act
      await nonexistentInstance.delete();
    });
  });
});
