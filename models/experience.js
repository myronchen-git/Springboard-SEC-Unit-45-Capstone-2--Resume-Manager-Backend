'use strict';

const db = require('../database/db');
const Document_X_Experience = require('./document_x_experience');
const { convertPropsForSqlUpdate } = require('../util/sqlHelpers');
const { convertDateToString } = require('../util/modelHelpers');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Represents an experience.
 */
class Experience {
  static tableName = 'experiences';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    id,
    owner,
    title,
    organization,
    location,
    start_date AS "startDate",
    end_date AS "endDate"`;

  // To help with SQL joins.  Unfortunately, existing code uses _allDbColsAsJs,
  // so this separate, redundant piece of code will have to exist like this for
  // now.
  static #allDbColsAsJs = (alias = '') => {
    alias &&= alias + '.';

    return `
    ${alias}id,
    ${alias}owner,
    ${alias}title,
    ${alias}organization,
    ${alias}location,
    ${alias}start_date AS "startDate",
    ${alias}end_date AS "endDate"`;
  };

  constructor(id, owner, title, organization, location, startDate, endDate) {
    this.id = id;
    this.owner = owner;
    this.title = title;
    this.organization = organization;
    this.location = location;
    this.startDate = startDate;
    this.endDate = endDate;
  }

  /**
   * Creates a new experience entry in the database.
   *
   * @param {Object} props - Contains data for creating a new experience.
   * @param {String} props.owner - Username that the experience belongs to.
   * @param {String} props.title - Job title or equivalent.
   * @param {String} props.organization - Name of the company or other type of
   *  organization.
   * @param {String} props.location - Location of the organization.
   * @param {String} props.startDate - The start date of joining the
   *  organization.
   * @param {String} [props.endDate] - The end date of leaving the organization.
   * @returns {Experience} A new Experience instance that contains the
   *  experience's data.
   */
  static async add(props) {
    const logPrefix = `${this.name}.add(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    // Allowed properties/attributes.
    const { owner, title, organization, location, startDate, endDate } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${Experience.tableName} (
    owner,
    title,
    organization,
    location,
    start_date,
    end_date
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING ${Experience._allDbColsAsJs};`,
      values: [owner, title, organization, location, startDate, endDate],
    };

    const result = await db.query({ queryConfig, logPrefix });

    const experience = new Experience(...Object.values(result.rows[0]));

    experience.startDate = convertDateToString(experience.startDate);
    experience.endDate = convertDateToString(experience.endDate);

    return experience;
  }

  /**
   * Retrieves all the experiences belonging to a user.
   *
   * @param {String} owner - Username to get the experiences for.
   * @returns {Experience[]} A list of Experience instances.
   */
  static async getAll(owner) {
    const logPrefix = `${this.name}.getAll(${owner})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${Experience._allDbColsAsJs}
  FROM ${Experience.tableName}
  WHERE owner = $1;`,
      values: [owner],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => {
      const experience = new Experience(...Object.values(data));

      experience.startDate = convertDateToString(experience.startDate);
      experience.endDate = convertDateToString(experience.endDate);

      return experience;
    });
  }

  /**
   * Gets all experiences belonging to a document.  The returned Experiences'
   * order is related to their positions.
   *
   * @param {Number} documentId - ID of the document to get experiences from.
   * @returns {Experience[]} A list of Experience instances.
   */
  static async getAllInDocument(documentId) {
    const logPrefix =
      `${this.name}.getAllInDocument(` + `documentId = ${documentId})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${Experience.#allDbColsAsJs('e')}
  FROM ${Document_X_Experience.tableName} AS dxe
  JOIN ${Experience.tableName} AS e
  ON dxe.experience_id = e.id
  WHERE dxe.document_id = $1
  ORDER BY dxe.position;`,
      values: [documentId],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new Experience(...Object.values(data)));
  }

  /**
   * Retrieves a specific experience by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific experience.
   * @param {Number} queryParams.id - ID of the experience.
   * @returns {Experience} A new Experience instance that contains the
   *  experience's data.
   */
  static async get(queryParams) {
    const logPrefix = `${this.name}.get(${JSON.stringify(queryParams)})`;
    logger.verbose(logPrefix);

    // Allowed parameters.
    const { id } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Experience._allDbColsAsJs}
  FROM ${Experience.tableName}
  WHERE id = $1;`,
      values: [id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rows.length === 0) {
      logger.error(`${logPrefix}: Experience not found.`);
      throw new NotFoundError(`Can not find experience with ID ${id}.`);
    }

    const experience = new Experience(...Object.values(result.rows[0]));

    experience.startDate = convertDateToString(experience.startDate);
    experience.endDate = convertDateToString(experience.endDate);

    return experience;
  }

  /**
   * Updates an experience with new properties.  If no properties are passed,
   * then the experience is not updated.
   *
   * @param {Object} props - Contains the updated properties.
   * @param {String} [props.title] - New job title or equivalent.
   * @param {String} [props.organization] - New name of the company or other
   *  type of organization.
   * @param {String} [props.location] - New location of the organization.
   * @param {String} [props.startDate] - New start date of joining the
   *  organization.
   * @param {String} [props.endDate] - New end date of leaving the organization.
   * @returns {Experience} The same Experience instance that this method was
   *  called on, but with updated property values.
   */
  async update(props) {
    const logPrefix = `${this.constructor.name}${JSON.stringify(
      this
    )}.update(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    const [sqlSubstring, sqlValues] = convertPropsForSqlUpdate(props);

    // Comma at end of sqlSubstring will be removed.
    const queryConfig = {
      text: `
  UPDATE ${Experience.tableName}
  SET ${sqlSubstring.slice(0, -1)}
  WHERE id = $${sqlValues.length + 1}
  RETURNING ${Experience._allDbColsAsJs};`,
      values: [...sqlValues, this.id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount === 0) {
      logger.error(
        `${logPrefix}: Experience with ID ${this.id} was not found.`
      );
      throw new AppServerError(`Experience with ID ${this.id} was not found.`);
    }

    // Update current instance's properties.
    Object.entries(result.rows[0]).forEach(([colName, val]) => {
      this[colName] = colName.includes('Date') ? convertDateToString(val) : val;
    });

    return this;
  }

  /**
   * Deletes an experience entry in the database.  Does not delete the instance
   * properties/fields.  Remember to delete the instance this belongs to!
   */
  async delete() {
    const logPrefix = `${this.constructor.name}${JSON.stringify(
      this
    )}.delete()`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  DELETE FROM ${Experience.tableName}
  WHERE id = $1;`,
      values: [this.id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(
        `${logPrefix}: ${result.rowCount} experience(s) deleted: ` +
          `id = ${this.id}.`
      );
    } else {
      logger.info(`${logPrefix}: 0 experiences deleted.`);
    }
  }
}

// ==================================================

module.exports = Experience;
