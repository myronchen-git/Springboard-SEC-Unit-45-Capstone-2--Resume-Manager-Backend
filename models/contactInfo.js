'use strict';

const db = require('../database/db');
const { convertPropsForSqlUpdate } = require('../util/sqlHelpers');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Represents contact information of a user.
 */
class ContactInfo {
  static tableName = 'contact_info';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    username,
    full_name AS "fullName",
    location,
    email,
    phone,
    linkedin,
    github`;

  constructor(username, fullName, location, email, phone, linkedin, github) {
    this.username = username;
    this.fullName = fullName;
    this.location = location;
    this.email = email;
    this.phone = phone;
    this.linkedin = linkedin;
    this.github = github;
  }

  /**
   * Creates a new contact info entry in the database.
   *
   * @param {Object} props - Contains data for creating a new contact info.
   * @param {String} props.username - The username that this contact info
   *  belongs to.
   * @param {String} props.fullName - The full name of the user.
   * @param {String} [props.location] - Any kind of location description for the
   *  user.  This can be full address, nearest city, etc..
   * @param {String} [props.email] - Email of the user.
   * @param {String} [props.phone] - Phone number of the user.
   * @param {String} [props.linkedin] - LinkedIn URL address for the profile of
   *  the user.
   * @param {String} [props.github] - GitHub URL address for the user's GitHub
   *  profile.
   * @returns {ContactInfo} A new ContactInfo instance that contains the user's
   *  contact information.
   */
  static async add(props) {
    const logPrefix = `ContactInfo.add(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    // Allowed properties/attributes.
    const { username, fullName, location, email, phone, linkedin, github } =
      props;

    const queryConfig = {
      text: `
  INSERT INTO ${ContactInfo.tableName} (
    username,
    full_name,
    location,
    email,
    phone,
    linkedin,
    github
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING ${ContactInfo._allDbColsAsJs};`,
      values: [username, fullName, location, email, phone, linkedin, github],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return new ContactInfo(...Object.values(result.rows[0]));
  }

  /**
   * Retrieves a specific contact info by username.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific contact info.
   * @param {String} queryParams.username - Username of the user to get contact
   *  info about.
   * @returns {ContactInfo} A new ContactInfo instance that contains the user's
   *  contact information.
   */
  static async get(queryParams) {
    const logPrefix = `ContactInfo.get(${JSON.stringify(queryParams)})`;
    logger.verbose(logPrefix);

    // Allowed parameters.
    const { username } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${ContactInfo._allDbColsAsJs}
  FROM ${ContactInfo.tableName}
  WHERE username = $1;`,
      values: [username],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rows.length === 0) {
      logger.error(`${logPrefix}: Contact info not found.`);
      throw new NotFoundError(
        `Can not find contact information for user "${username}".`
      );
    }

    const data = result.rows[0];
    return new ContactInfo(...Object.values(data));
  }

  /**
   * Updates a contact info with new properties.  If no properties are passed,
   * then the contact info is not updated.
   *
   * @param {Object} props - Contains the updated properties.
   * @param {String} [props.fullName] - New full name of the user.
   * @param {String} [props.location] - New location of the user.
   * @param {String} [props.email] - New email of the user.
   * @param {String} [props.phone] - New phone number of the user.
   * @param {String} [props.linkedin] - New LinkedIn URL address for the profile
   *  of the user.
   * @param {String} [props.github] - New GitHub URL address for the user's
   *  GitHub profile.
   * @returns {ContactInfo} The same ContactInfo instance that this method was
   *  called on, but with updated property values.
   */
  async update(props) {
    const logPrefix = `ContactInfo.update(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    const allowedProps = [
      'fullName',
      'location',
      'email',
      'phone',
      'linkedin',
      'github',
    ];
    const filteredProps = Object.fromEntries(
      Object.entries(props).filter((prop) => allowedProps.includes(prop[0]))
    );

    // If given no arguments, return.
    if (!Object.keys(filteredProps).length) return this;

    const [sqlSubstring, sqlValues] = convertPropsForSqlUpdate(filteredProps);

    // Comma at end of sqlSubstring will be removed.
    const queryConfig = {
      text: `
  UPDATE ${ContactInfo.tableName}
  SET ${sqlSubstring.slice(0, -1)}
  WHERE username = $${sqlValues.length + 1}
  RETURNING ${ContactInfo._allDbColsAsJs};`,
      values: [...sqlValues, this.username],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount === 0) {
      logger.error(
        `${logPrefix}: Contact info not found.  ` +
          `username = "${this.username}".`
      );
      throw new AppServerError(
        `Contact info for user "${this.username}" was not found.`
      );
    }

    // Update current instance's properties.
    Object.entries(result.rows[0]).forEach(([colName, val]) => {
      this[colName] = val;
    });

    return this;
  }

  /**
   * Deletes a contact info entry in the database.  Does not delete the instance
   * properties/fields.  Remember to delete the instance this belongs to!
   */
  async delete() {
    const logPrefix = 'ContactInfo.delete()';
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  DELETE FROM ${ContactInfo.tableName}
  WHERE username = $1;`,
      values: [this.username],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(
        `${logPrefix}: ${result.rowCount} contact info deleted: ` +
          `username = "${this.username}".`
      );
    } else {
      logger.info(`${logPrefix}: 0 contact info deleted.`);
    }
  }
}

// ==================================================

module.exports = ContactInfo;
