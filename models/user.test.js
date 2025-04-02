'use strict';

const db = require('../database/db');
const User = require('./user');

const { AppServerError, NotFoundError } = require('../errors/appErrors');
const { RegistrationError, SigninError } = require('../errors/userErrors');

const { users } = require('../_testData');
const { commonBeforeAll, clearTable } = require('../_testCommon');

// ==================================================

describe('User', () => {
  const testUser = users[0];

  const expectedUserData = Object.freeze({
    username: users[0].username,
    password: expect.any(String),
  });

  // To help with expects by directly getting data from the database.
  const sqlTextSelectAll = `
  SELECT
    username,
    password
  FROM ${User.tableName}`;

  // To help with expects by filtering data retrieved from the database.
  const whereClauseToGetOne = '\n  WHERE username = $1';

  beforeAll(() => commonBeforeAll(db));

  beforeEach(() => clearTable(db, User.tableName));

  afterAll(() => db.shutdown());

  // -------------------------------------------------- register

  describe('register', () => {
    test('Registers a new user.', async () => {
      // Act
      const user = await User.register(testUser);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user).toEqual({ username: testUser.username });

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text: sqlTextSelectAll + `${whereClauseToGetOne};`,
            values: [user.username],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(expectedUserData);
      expect(databaseEntry.password).not.toBe(testUser.password);
    });

    test('Throws an Error if username is not available.', async () => {
      // Arrange
      await User.register(testUser);

      // Act
      async function runFunc() {
        await User.register(testUser);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(RegistrationError);

      const databaseEntries = (
        await db.query({
          queryConfig: {
            text: sqlTextSelectAll + ';',
          },
        })
      ).rows;

      expect(databaseEntries.length).toBe(1);
    });
  });

  // -------------------------------------------------- signin

  describe('signin', () => {
    test('Signs in a user.', async () => {
      // Arrange
      await User.register(testUser);

      // Act
      const user = await User.signin(testUser);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user).toEqual({ username: testUser.username });
    });

    test('Throws an Error if username is not found.', async () => {
      // Act
      async function runFunc() {
        await User.signin(testUser);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(SigninError);
    });

    test('Throws an Error if password is invalid.', async () => {
      // Arrange
      await User.register(testUser);

      const wrongCredentials = Object.freeze({
        username: testUser.username,
        password: 'wrong password',
      });

      // Act
      async function runFunc() {
        await User.signin(wrongCredentials);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(SigninError);
    });
  });

  // -------------------------------------------------- update

  describe('class update', () => {
    test("Updates a user's info.", async () => {
      // Arrange
      await User.register(testUser);
      const updatedInfo = Object.freeze({ password: 'updated' });

      // Act
      const user = await User.update(testUser.username, updatedInfo);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user).toEqual({ username: testUser.username });

      const databaseEntry = (
        await db.query({
          queryConfig: {
            text: sqlTextSelectAll + `${whereClauseToGetOne};`,
            values: [user.username],
          },
        })
      ).rows[0];

      expect(databaseEntry).toEqual(expectedUserData);
      expect(databaseEntry.password).not.toBe(updatedInfo.password);
    });

    test('Throws an Error if username is not found.', async () => {
      // Arrange
      const updatedInfo = Object.freeze({ password: 'updated' });

      // Act
      async function runFunc() {
        await User.update('nonexistent', updatedInfo);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(NotFoundError);
    });
  });

  describe('instance update unit tests', () => {
    let origUpdate = User.update;

    afterAll(() => {
      User.update = origUpdate;
    });

    test("Updates a user's info.", async () => {
      // Arrange
      const user = await User.register(testUser);
      const updatedInfo = Object.freeze({ password: 'updated' });

      User.update = jest.fn().mockResolvedValue(new User(testUser.username));

      // Act
      const updatedUser = await user.update(updatedInfo);

      // Assert
      expect(updatedUser).toBe(user);

      const expectedUser = { ...updatedInfo, username: testUser.username };
      delete expectedUser.password;

      expect(updatedUser).toEqual(expectedUser);
    });

    test('Rethrows NotFoundError as AppServerError.', async () => {
      // Arrange
      const user = await User.register(testUser);
      const updatedInfo = Object.freeze({ password: 'updated' });

      const errorMessage = 'An error message.';
      User.update = jest
        .fn()
        .mockRejectedValue(new NotFoundError(errorMessage));

      // Act
      async function runFunc() {
        await user.update(updatedInfo);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(AppServerError);
      await expect(runFunc).rejects.toThrow(errorMessage);
    });
  });

  // -------------------------------------------------- delete

  describe('delete', () => {
    test('Deletes a user.', async () => {
      // Arrange
      const user = await User.register(testUser);

      // Act
      await user.delete();

      // Assert
      const databaseEntries = (
        await db.query({
          queryConfig: {
            text: sqlTextSelectAll + `${whereClauseToGetOne};`,
            values: [user.username],
          },
        })
      ).rows;

      expect(databaseEntries.length).toBe(0);
    });

    test('Does not throw an Error if username is not found.', async () => {
      // Arrange
      const user = new User('nonexistent');

      // Act
      await user.delete();
    });
  });
});
