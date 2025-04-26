'use strict';

const db = require('../database/db');
const { convertPropsForSqlUpdate } = require('../util/sqlHelpers');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Represents a skill.
 */
class Skill {
  static tableName = 'skills';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    id,
    name,
    owner,
    text_snippet_id AS "textSnippetId",
    text_snippet_version AS "textSnippetVersion"`;

  constructor(id, name, owner, textSnippetId, textSnippetVersion) {
    this.id = id;
    this.name = name;
    this.owner = owner;
    this.textSnippetId = textSnippetId;
    this.textSnippetVersion = textSnippetVersion;
  }

  /**
   * Creates a new skill entry in the database.
   *
   * @param {Object} props - Contains data for creating a new skill.
   * @param {String} props.name - Name for this bunch of text for skill.
   * @param {String} props.owner - Username that the skill belongs to.
   * @param {Number} props.textSnippetId - ID of the text snippet that this
   *  skill will use.
   * @param {Date} props.textSnippetVersion - Version of the text snippet that
   *  this skill will use.
   * @returns {Skill} A new Skill instance that contains the skill's data.
   */
  static async add(props) {
    const logPrefix = `Skill.add(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    // Allowed properties/attributes.
    const { name, owner, textSnippetId, textSnippetVersion } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${Skill.tableName} (
    name,
    owner,
    text_snippet_id,
    text_snippet_version
  )
  VALUES ($1, $2, $3, $4)
  RETURNING ${Skill._allDbColsAsJs};`,
      values: [name, owner, textSnippetId, textSnippetVersion],
    };

    const result = await db.query({
      queryConfig,
      logPrefix,
      errorCallback: (err) => {
        // PostgreSQL error code 23503 is for foreign key violation.
        if (err.code === '23503') {
          throw new NotFoundError(
            'Owner or text snippet was not found.  ' +
              `Owner: ${props.owner}, ` +
              `text snippet ID: ${props.textSnippetId}, ` +
              `text snippet version: ${props.textSnippetVersion}.`
          );
        }
      },
    });

    return new Skill(...Object.values(result.rows[0]));
  }

  /**
   * Retrieves all the skills belonging to a user.
   *
   * @param {String} owner - Username to get the skills for.
   * @returns {Skill[]} A list of Skill instances.
   */
  static async getAll(owner) {
    const logPrefix = `Skill.getAll(${owner})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${Skill._allDbColsAsJs}
  FROM ${Skill.tableName}
  WHERE owner = $1;`,
      values: [owner],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new Skill(...Object.values(data)));
  }

  /**
   * Retrieves a specific skill by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific skill.
   * @param {Number} [queryParams.id] - ID of the skill.
   * @param {String} [queryParams.name] - Name of the skill.
   * @returns {Skill} A new Skill instance that contains the skill's data.
   */
  static async get(queryParams) {
    const logPrefix = `Skill.get(${JSON.stringify(queryParams)})`;
    logger.verbose(logPrefix);

    // Allowed parameters.
    const { id, name } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Skill._allDbColsAsJs}
  FROM ${Skill.tableName}
  WHERE ${id == undefined ? 'name' : 'id'} = $1;`,
      values: [id == undefined ? name : id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rows.length === 0) {
      logger.error(`${logPrefix}: Skill not found.`);
      throw new NotFoundError(
        `Can not find skill with ID ${id} / name "${name}".`
      );
    }

    const data = result.rows[0];
    return new Skill(...Object.values(data));
  }

  /**
   * Updates a skill with new properties.  If no properties are passed, then the
   * skill is not updated.
   *
   * @param {Object} props - Contains the updated properties.
   * @param {String} [props.name] - New name for this bunch of text for skill.
   * @returns {Skill} The same Skill instance that this method was
   *  called on, but with updated property values.
   */
  async update(props) {
    const logPrefix = `Skill.update(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    const [sqlSubstring, sqlValues] = convertPropsForSqlUpdate(props);

    // Comma at end of sqlSubstring will be removed.
    const queryConfig = {
      text: `
  UPDATE ${Skill.tableName}
  SET ${sqlSubstring.slice(0, -1)}
  WHERE id = $${sqlValues.length + 1}
  RETURNING ${Skill._allDbColsAsJs};`,
      values: [...sqlValues, this.id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount === 0) {
      logger.error(`${logPrefix}: Skill with ID ${this.id} was not found.`);
      throw new AppServerError(`Skill with ID ${this.id} was not found.`);
    }

    // Update current instance's properties.
    Object.entries(result.rows[0]).forEach(([colName, val]) => {
      this[colName] = val;
    });

    return this;
  }

  /**
   * Deletes a skill entry in the database.  Does not delete the instance
   * properties/fields.  Remember to delete the instance this belongs to!
   */
  async delete() {
    const logPrefix = `Skill.delete()`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  DELETE FROM ${Skill.tableName}
  WHERE id = $1;`,
      values: [this.id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(
        `${logPrefix}: ${result.rowCount} skill(s) deleted: id = ${this.id}.`
      );
    } else {
      logger.info(`${logPrefix}: 0 skills deleted.`);
    }
  }
}

// ==================================================

module.exports = Skill;
