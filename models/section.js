'use strict';

const db = require('../database/db');
const Document_X_Section = require('./document_x_section');
const { convertPropsForSqlUpdate } = require('../util/sqlHelpers');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Represents a resume section.  Examples are education, skills, and work
 * experience.
 */
class Section {
  static tableName = 'sections';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    id,
    section_name AS "sectionName"`;

  constructor(id, sectionName) {
    this.id = id;
    this.sectionName = sectionName;
  }

  /**
   * Creates a new section entry in the database.
   *
   * @param {Object} sectionProps - Contains data for creating a new section.
   * @param {String} sectionProps.sectionName - Name of the section.
   * @returns {Section} A new Section instance that contains the section's
   *  data.
   */
  static async add(sectionProps) {
    const logPrefix = `Section.add(${JSON.stringify(sectionProps)})`;
    logger.verbose(logPrefix);

    // Allowed properties/attributes.
    const { sectionName } = sectionProps;

    const queryConfig = {
      text: `
  INSERT INTO ${Section.tableName} (section_name)
  VALUES ($1)
  RETURNING ${Section._allDbColsAsJs};`,
      values: [sectionName],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return new Section(...Object.values(result.rows[0]));
  }

  /**
   * Retrieves all the sections.
   *
   * @returns {Section[]} A list of Section instances.
   */
  static async getAll() {
    const logPrefix = 'Section.getAll()';
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${Section._allDbColsAsJs}
  FROM ${Section.tableName};`,
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new Section(...Object.values(data)));
  }

  /**
   * Gets all sections belonging to a document.  The returned Sections' order is
   * related to their positions.
   *
   * @param {Number} documentId - ID of the document to get sections from.
   * @returns {Section[]} A list of Section instances.
   */
  static async getAllInDocument(documentId) {
    const logPrefix = `Section.getAllInDocument(documentId = ${documentId})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${Section._allDbColsAsJs}
  FROM ${Document_X_Section.tableName} AS dxs
  JOIN ${Section.tableName} AS s
  ON dxs.section_id = s.id
  WHERE dxs.document_id = $1
  ORDER BY dxs.position;`,
      values: [documentId],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new Section(...Object.values(data)));
  }

  /**
   * Retrieves a specific section by ID or name.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific section.
   * @param {Number} [queryParams.id] - ID of the section.
   * @param {String} [queryParams.sectionName] - Name of the section.
   * @returns {Section} A new Section instance that contains the section's
   *  data.
   */
  static async get(queryParams) {
    const logPrefix = `Section.get(${JSON.stringify(queryParams)})`;
    logger.verbose(logPrefix);

    // Allowed parameters.
    const { id, sectionName } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Section._allDbColsAsJs}
  FROM ${Section.tableName}
  WHERE ${id == undefined ? 'section_name' : 'id'} = $1;`,
      values: [id == undefined ? sectionName : id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rows.length === 0) {
      logger.error(`${logPrefix}: Section not found.`);
      throw new NotFoundError(`Can not find section "${sectionName}".`);
    }

    const data = result.rows[0];
    return new Section(...Object.values(data));
  }

  /**
   * Updates a section with new properties.  If no properties are passed, then
   * the section is not updated.
   *
   * @param {Object} sectionProps - Contains the updated properties.
   * @param {String} [sectionProps.sectionName] - The new name of the section.
   * @returns {Section} The same Section instance that this method was called
   *  on, but with updated property values.
   */
  async update(sectionProps) {
    const logPrefix = `Section.update(${JSON.stringify(sectionProps)})`;
    logger.verbose(logPrefix);

    const allowedProps = ['sectionName'];
    const filteredProps = Object.fromEntries(
      Object.entries(sectionProps).filter((prop) =>
        allowedProps.includes(prop[0])
      )
    );

    // If given no arguments, return.
    if (!Object.keys(filteredProps).length) return this;

    const [sqlSubstring, sqlValues] = convertPropsForSqlUpdate(filteredProps);

    // Comma at end of sqlSubstring will be removed.
    const queryConfig = {
      text: `
  UPDATE ${Section.tableName}
  SET ${sqlSubstring.slice(0, -1)}
  WHERE id = $${sqlValues.length + 1}
  RETURNING ${Section._allDbColsAsJs};`,
      values: [...sqlValues, this.id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount === 0) {
      logger.error(
        `${logPrefix}: Section ID ${this.id} with ` +
          `name "${this.sectionName}" was not found.`
      );
      throw new AppServerError(
        `Section ID ${this.id} with ` +
          `name "${this.sectionName}" was not found.`
      );
    }

    // Update current instance's properties.
    Object.entries(result.rows[0]).forEach(([colName, val]) => {
      this[colName] = val;
    });

    return this;
  }

  /**
   * Deletes a section entry in the database.  Does not delete the instance
   * properties/fields.  Remember to delete the instance this belongs to!
   */
  async delete() {
    const logPrefix = `Section.delete()`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  DELETE FROM ${Section.tableName}
  WHERE id = $1;`,
      values: [this.id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(
        `${logPrefix}: ${result.rowCount} section(s) deleted: id = ${this.id}.`
      );
    } else {
      logger.info(`${logPrefix}: 0 sections deleted.`);
    }
  }
}

// ==================================================

module.exports = Section;
