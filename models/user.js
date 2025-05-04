'use strict';

const bcrypt = require('bcrypt');

const db = require('../database/db');

const { AppServerError, NotFoundError } = require('../errors/appErrors');
const { RegistrationError, SigninError } = require('../errors/userErrors');

const { BCRYPT_WORK_FACTOR } = require('../config');
const logger = require('../util/logger');

// ==================================================

/**
 * Represents a user account.
 */
class User {
  static tableName = 'users';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    username`;

  static usernameRequirementsMessage = 'Username must be 3-30 characters long.';
  static passwordRequirementsMessage =
    'Password must be 6-20 characters long and contain a ' +
    'number, uppercase letter, lowercase letter, and symbol.';

  constructor(username) {
    this.username = username;
  }

  /**
   * Creates a new user entry into the database.
   *
   * @param {Object} data - Contains data for creating a new account.
   * @param {String} data.username - Name of the account.
   * @param {String} data.password - Password of the account.
   * @returns {Promise<User>} A new User instance that contains the user's data.
   */
  static async register({ username, password }) {
    const logPrefix =
      `${this.name}.register(` +
      `{ username: '${username}', password: (password) })`;
    logger.verbose(logPrefix);

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const queryConfig = {
      text: `
  INSERT INTO ${User.tableName} VALUES
    ($1, $2)
  RETURNING ${User._allDbColsAsJs};`,
      values: [username, hashedPassword],
    };

    const result = await db.query({
      queryConfig,
      logPrefix,
      errorCallback: (err) => {
        // PostgreSQL error code 23505 is for unique constraint violation.
        if (err.code === '23505') {
          throw new RegistrationError(
            `Username "${username}" is not available.`
          );
        }
      },
    });

    const data = result.rows[0];
    return new User(...Object.values(data));
  }

  /**
   * Signs/logs in a user.
   *
   * @param {Object} data - Contains data for signing into an account.
   * @param {String} data.username - Name of the account.
   * @param {String} data.password - Password of the account.
   * @returns {Promise<User>} A new User instance that contains the user's data.
   * @throws {SigninError} If user does not exist or password is incorrect.
   */
  static async signin({ username, password }) {
    const logPrefix =
      `${this.name}.signin(` +
      `{ username: '${username}', password: (password) })`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT username, password
  FROM ${User.tableName}
  WHERE username = $1;`,
      values: [username],
    };

    const result = await db.query({ queryConfig, logPrefix });

    const data = result.rows[0];
    if (data && (await bcrypt.compare(password, data.password))) {
      delete data.password;
      return new User(...Object.values(data));
    }

    logger.error(
      `${logPrefix}: Invalid username/password when signing into "${username}".`
    );
    throw new SigninError('Invalid username/password.');
  }

  /**
   * Updates a user entry in the database.  Currently, this only updates the
   * password.
   *
   * @param {String} username - Username of the account to update.
   * @param {Object} data - Contains data for updating an account.
   * @param {String} data.password - New password for the account.
   * @returns {Promise<User>} A new User instance that contains the user's data.
   * @throws {NotFoundError} If user does not exist.
   */
  static async update(username, { password }) {
    const logPrefix =
      `${this.name}.update(` +
      `{ username: '${username}', { password: (password) } )`;
    logger.verbose(logPrefix + `: Updating info for "${username}".`);

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const queryConfig = {
      text: `
  UPDATE ${User.tableName}
  SET password = $1
  WHERE username = $2
  RETURNING ${User._allDbColsAsJs};`,
      values: [hashedPassword, username],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount === 0) {
      logger.error(`${logPrefix}: Username "${username}" not found.`);
      throw new NotFoundError(`Username "${username}" not found.`);
    }

    const data = result.rows[0];
    return new User(...Object.values(data));
  }

  /**
   * Updates a user entry in the database, using a User instance.
   *
   * @param {Object} data - Contains data for updating an account.
   * @returns {Promise<User>} The same User instance that this method was called
   *  on, but with updated property values.
   * @throws {AppServerError} If the user that this instance represents has
   *  already been deleted.
   */
  async update(data) {
    let user;
    try {
      user = await User.update(this.username, data);
    } catch (err) {
      if (err instanceof NotFoundError) {
        // If user is not found, then this User instance is stale and represents
        // a deleted user.
        throw new AppServerError(err.message);
      } else {
        throw err;
      }
    }

    // Update current instance's properties.
    Object.entries(user).forEach(([colName, val]) => {
      this[colName] = val;
    });

    return this;
  }

  /**
   * Deletes a user entry in the database.  Does not delete the username
   * instance variable.  Remember to delete the User instance this belongs to!
   */
  async delete() {
    const logPrefix = `${this.constructor.name}${JSON.stringify(
      this
    )}.delete()`;
    logger.verbose(logPrefix + `: Deleting "${this.username}".`);

    const queryConfig = {
      text: `
  DELETE FROM ${User.tableName}
  WHERE username = $1;`,
      values: [this.username],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(
        `${logPrefix}: ${result.rowCount} user(s) deleted: ` +
          `username = ${this.username}.`
      );
    } else {
      logger.info(`${logPrefix}: 0 users deleted.`);
    }
  }
}

// ==================================================

module.exports = User;
