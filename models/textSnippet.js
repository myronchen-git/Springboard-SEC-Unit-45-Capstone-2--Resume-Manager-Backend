'use strict';

const db = require('../database/db');

const Document_X_Experience = require('./document_x_experience');
const Experience_X_Text_Snippet = require('./experience_x_textSnippet');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Represents a text snippet.  This can be for a bullet point, job description,
 * or skill.  It is a String of text that can be placed anywhere.  When updated,
 * a new text snippet is created, instead of modifying an existing one.
 */
class TextSnippet {
  static tableName = 'text_snippets';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    id,
    version,
    owner,
    parent,
    type,
    content`;

  // To help with SQL joins.  Unfortunately, existing code uses _allDbColsAsJs,
  // so this separate, redundant piece of code will have to exist like this for
  // now.
  static #allDbColsAsJs = (alias = '') => {
    alias &&= alias + '.';

    return `
    ${alias}id,
    ${alias}version,
    ${alias}owner,
    ${alias}parent,
    ${alias}type,
    ${alias}content`;
  };

  constructor(id, version, owner, parent, type, content) {
    this.id = id;
    this.version = version;
    this.owner = owner;
    this.parent = parent;
    this.type = type;
    this.content = content;
  }

  /**
   * Creates a new text snippet entry in the database.
   *
   * @param {Object} props - Contains data for creating a new text snippet.
   * @param {String} props.owner - Username that the text snippet belongs to.
   * @param {String} props.type - The type of content, such as bullet point
   *  or description.
   * @param {String} props.content - Content of the text snippet.
   * @returns {TextSnippet} A new TextSnippet instance that contains the
   *  text snippet's data.
   */
  static async add(props) {
    const logPrefix = `${this.name}.add(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    // Allowed properties/attributes.
    const { owner, type, content } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${TextSnippet.tableName} (owner, type, content)
  VALUES ($1, $2, $3)
  RETURNING ${TextSnippet._allDbColsAsJs};`,
      values: [owner, type, content],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return new TextSnippet(...Object.values(result.rows[0]));
  }

  /**
   * Retrieves all the text snippets belonging to a user.
   *
   * @param {String} owner - Username to get the text snippets for.
   * @returns {TextSnippet[]} A list of TextSnippet instances.
   */
  static async getAll(owner) {
    const logPrefix = `${this.name}.getAll(${owner})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${TextSnippet._allDbColsAsJs}
  FROM ${TextSnippet.tableName}
  WHERE owner = $1;`,
      values: [owner],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new TextSnippet(...Object.values(data)));
  }

  /**
   * Gets all text snippets for a specified experience from a user.
   *
   * @param {String} owner - Name of the user to get text snippets for.
   * @param {Number} experienceId - ID of the experience to get text snippets
   *  for.
   * @returns {TextSnippet[]} A list of text snippets belonging to an
   *  experience.
   */
  static async getAllForExperience(owner, experienceId) {
    const logPrefix =
      `${this.name}.getAllForExperience(` +
      `owner = ${owner}, ` +
      `experienceId = ${experienceId})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT DISTINCT ${TextSnippet.#allDbColsAsJs('t')}
  FROM ${TextSnippet.tableName} AS t
  JOIN ${Experience_X_Text_Snippet.tableName} AS ext
  ON t.id = ext.text_snippet_id AND t.version = ext.text_snippet_version
  JOIN ${Document_X_Experience.tableName} AS dxe
  ON ext.document_x_experience_id = dxe.id
  WHERE t.owner = $1 AND dxe.experience_id = $2;`,
      values: [owner, experienceId],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new TextSnippet(...Object.values(data)));
  }

  /**
   * Gets all text snippets for a specified experience in a document from a
   * user.
   *
   * @param {String} owner - Name of the user to get text snippets for.
   * @param {Number} documentId - ID of the document that the experience belongs
   *  to.
   * @param {Number} experienceId - ID of the experience to get text snippets
   *  for.
   * @returns {TextSnippet[]} A list of text snippets belonging to an
   *  experience, ordered by position.
   */
  static async getAllForExperienceInDocument(owner, documentId, experienceId) {
    const logPrefix =
      `${this.name}.getAllForExperienceInDocument(` +
      `owner = ${owner}, ` +
      `documentId = ${documentId}, ` +
      `experienceId = ${experienceId})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
      SELECT ${TextSnippet.#allDbColsAsJs('t')}
      FROM ${TextSnippet.tableName} AS t
      JOIN ${Experience_X_Text_Snippet.tableName} AS ext
      ON t.id = ext.text_snippet_id AND t.version = ext.text_snippet_version
      JOIN ${Document_X_Experience.tableName} AS dxe
      ON ext.document_x_experience_id = dxe.id
      WHERE t.owner = $1 AND dxe.document_id = $2 AND dxe.experience_id = $3
      GROUP BY t.id, t.version, ext.position
      ORDER BY ext.position;`,
      values: [owner, documentId, experienceId],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new TextSnippet(...Object.values(data)));
  }

  /**
   * Retrieves a specific text snippet by ID and version.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific text snippet.
   * @param {Number} queryParams.id - ID of the text snippet.
   * @param {Date} queryParams.version - Timestamp of the text snippet.
   * @returns {TextSnippet} A new TextSnippet instance that contains the text
   *  snippet's data.
   */
  static async get(queryParams) {
    const logPrefix = `${this.name}.get(${JSON.stringify(queryParams)})`;
    logger.verbose(logPrefix);

    // Allowed parameters.
    const { id, version } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${TextSnippet._allDbColsAsJs}
  FROM ${TextSnippet.tableName}
  WHERE id = $1 AND version = $2;`,
      values: [id, version],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rows.length === 0) {
      logger.error(`${logPrefix}: TextSnippet not found.`);
      throw new NotFoundError(
        `Can not find text snippet with ID ${id} and version ${version}.`
      );
    }

    const data = result.rows[0];
    return new TextSnippet(...Object.values(data));
  }

  /**
   * Makes a new text snippet with new properties, with certain properties from
   * the old.  The old snippet is kept.
   *
   * @param {Object} props - Contains the updated properties.
   * @param {String} [props.type] - New type of content.
   * @param {String} [props.content] - New content of the text snippet.
   * @throws {AppServerError} If the old text snippet did not exist.
   * @returns {TextSnippet} A new TextSnippet instance, which has a different
   *  version from the original snippet, and the parent referencing the original
   *  snippet.
   */
  async update(props) {
    const logPrefix = `${this.constructor.name}${JSON.stringify(
      this
    )}.update(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    // Make a new entry so that the old version is kept.
    const queryConfig = {
      text: `
  INSERT INTO ${TextSnippet.tableName} (id, owner, parent, type, content)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING ${TextSnippet._allDbColsAsJs};`,
      values: [
        this.id,
        this.owner,
        this.version,
        props.type || this.type,
        props.content || this.content,
      ],
    };

    const result = await db.query({
      queryConfig,
      logPrefix,
      errorCallback: (err) => {
        // PostgreSQL error code 23503 is for foreign key constraint violation.
        if (err.code === '23503') {
          throw new AppServerError(
            `TextSnippet ID ${this.id}, version ${this.version} was not found.`
          );
        }
      },
    });

    return new TextSnippet(...Object.values(result.rows[0]));
  }

  /**
   * Deletes a text snippet entry in the database.  Does not delete the instance
   * properties/fields.  Remember to delete the instance this belongs to!
   *
   * All current instances of the newer versions of the text snippet will be
   * obsolete, as their parent property will still point to a version that no
   * longer exists.
   */
  async delete() {
    const logPrefix = `${this.constructor.name}${JSON.stringify(
      this
    )}.delete()`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  DELETE FROM ${TextSnippet.tableName}
  WHERE id = $1 AND version = $2;`,
      values: [this.id, this.version],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(
        `${logPrefix}: ${result.rowCount} text snippet(s) deleted: ` +
          `id = ${this.id}, version = ${this.version}.`
      );
    } else {
      logger.info(`${logPrefix}: 0 text snippets deleted.`);
    }
  }
}

// ==================================================

module.exports = TextSnippet;
