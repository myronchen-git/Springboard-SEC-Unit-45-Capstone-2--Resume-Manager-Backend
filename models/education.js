'use strict';

const db = require('../database/db');
const Document_X_Education = require('./document_x_education');
const { convertPropsForSqlUpdate } = require('../util/sqlHelpers');
const { convertDateToString } = require('../util/modelHelpers');

const { AppServerError, NotFoundError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Represents an education.
 */
class Education {
  static tableName = 'educations';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    id,
    owner,
    school,
    location,
    start_date AS "startDate",
    end_date AS "endDate",
    degree,
    gpa,
    awards_and_honors AS "awardsAndHonors",
    activities`;

  constructor(
    id,
    owner,
    school,
    location,
    startDate,
    endDate,
    degree,
    gpa,
    awardsAndHonors,
    activities
  ) {
    this.id = id;
    this.owner = owner;
    this.school = school;
    this.location = location;
    this.startDate = startDate;
    this.endDate = endDate;
    this.degree = degree;
    this.gpa = gpa;
    this.awardsAndHonors = awardsAndHonors;
    this.activities = activities;
  }

  /**
   * Creates a new education entry in the database.
   *
   * @param {Object} props - Contains data for creating a new education.
   * @param {String} props.owner - Username that the education belongs to.
   * @param {String} props.school - School or education center name.
   * @param {String} props.location - Location of school.
   * @param {String} props.startDate - The start date of joining the school.
   * @param {String} props.endDate - The end date of leaving the school.
   * @param {String} props.degree - The degree name that was or will be given
   *  from the school.
   * @param {String} [props.gpa] - The grade point average throughout the
   *  attendance.
   * @param {String} [props.awardsAndHonors] - Any awards or honors given by the
   *  school.
   * @param {String} [props.activities] - Any activities done in relation to the
   *  school.
   * @returns {Education} A new Education instance that contains the education's
   *  data.
   */
  static async add(props) {
    const logPrefix = `${this.name}.add(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    // Allowed properties/attributes.
    const {
      owner,
      school,
      location,
      startDate,
      endDate,
      degree,
      gpa,
      awardsAndHonors,
      activities,
    } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${Education.tableName} (
    owner,
    school,
    location,
    start_date,
    end_date,
    degree,
    gpa,
    awards_and_honors,
    activities
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING ${Education._allDbColsAsJs};`,
      values: [
        owner,
        school,
        location,
        startDate,
        endDate,
        degree,
        gpa,
        awardsAndHonors,
        activities,
      ],
    };

    const result = await db.query({ queryConfig, logPrefix });

    const education = new Education(...Object.values(result.rows[0]));

    education.startDate = convertDateToString(education.startDate);
    education.endDate = convertDateToString(education.endDate);

    return education;
  }

  /**
   * Retrieves all the educations belonging to a user.
   *
   * @param {String} owner - Username to get the educations for.
   * @returns {Education[]} A list of Education instances.
   */
  static async getAll(owner) {
    const logPrefix = `${this.name}.getAll(${owner})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${Education._allDbColsAsJs}
  FROM ${Education.tableName}
  WHERE owner = $1;`,
      values: [owner],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => {
      const education = new Education(...Object.values(data));

      education.startDate = convertDateToString(education.startDate);
      education.endDate = convertDateToString(education.endDate);

      return education;
    });
  }

  /**
   * Gets all educations belonging to a document.  The returned Educations'
   * order is related to their positions.
   *
   * @param {Number} documentId - ID of the document to get educations from.
   * @returns {Education[]} A list of Education instances.
   */
  static async getAllInDocument(documentId) {
    const logPrefix = `${this.name}.getAllInDocument(documentId = ${documentId})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${Education._allDbColsAsJs}
  FROM ${Document_X_Education.tableName} AS dxe
  JOIN ${Education.tableName} AS e
  ON dxe.education_id = e.id
  WHERE dxe.document_id = $1
  ORDER BY dxe.position;`,
      values: [documentId],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new Education(...Object.values(data)));
  }

  /**
   * Retrieves a specific education by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific education.
   * @param {Number} queryParams.id - ID of the education.
   * @returns {Education} A new Education instance that contains the education's
   *  data.
   */
  static async get(queryParams) {
    const logPrefix = `${this.name}.get(${JSON.stringify(queryParams)})`;
    logger.verbose(logPrefix);

    // Allowed parameters.
    const { id } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Education._allDbColsAsJs}
  FROM ${Education.tableName}
  WHERE id = $1;`,
      values: [id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rows.length === 0) {
      logger.error(`${logPrefix}: Education not found.`);
      throw new NotFoundError(`Can not find education with ID ${id}.`);
    }

    const education = new Education(...Object.values(result.rows[0]));

    education.startDate = convertDateToString(education.startDate);
    education.endDate = convertDateToString(education.endDate);

    return education;
  }

  /**
   * Updates an education with new properties.  If no properties are passed,
   * then the education is not updated.
   *
   * @param {Object} props - Contains the updated properties.
   * @param {String} [props.school] - New school or education center name.
   * @param {String} [props.location] - New location of school.
   * @param {String} [props.startDate] - New start date of joining the school.
   * @param {String} [props.endDate] - New end date of leaving the school.
   * @param {String} [props.degree] - New degree name that was or will be given
   *  from the school.
   * @param {String} [props.gpa] - New grade point average throughout the
   *  attendance.
   * @param {String} [props.awardsAndHonors] - New awards or honors String.
   * @param {String} [props.activities] - New activities String.
   * @returns {Education} The same Education instance that this method was
   *  called on, but with updated property values.
   */
  async update(props) {
    const logPrefix = `${this.name}.update(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    const [sqlSubstring, sqlValues] = convertPropsForSqlUpdate(props);

    // Comma at end of sqlSubstring will be removed.
    const queryConfig = {
      text: `
  UPDATE ${Education.tableName}
  SET ${sqlSubstring.slice(0, -1)}
  WHERE id = $${sqlValues.length + 1}
  RETURNING ${Education._allDbColsAsJs};`,
      values: [...sqlValues, this.id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount === 0) {
      logger.error(`${logPrefix}: Education with ID ${this.id} was not found.`);
      throw new AppServerError(`Education with ID ${this.id} was not found.`);
    }

    // Update current instance's properties.
    Object.entries(result.rows[0]).forEach(([colName, val]) => {
      this[colName] = colName.includes('Date') ? convertDateToString(val) : val;
    });

    return this;
  }

  /**
   * Deletes an education entry in the database.  Does not delete the instance
   * properties/fields.  Remember to delete the instance this belongs to!
   */
  async delete() {
    const logPrefix = `${this.name}.delete()`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  DELETE FROM ${Education.tableName}
  WHERE id = $1;`,
      values: [this.id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(
        `${logPrefix}: ${result.rowCount} education(s) deleted: ` +
          `id = ${this.id}.`
      );
    } else {
      logger.info(`${logPrefix}: 0 educations deleted.`);
    }
  }
}

// ==================================================

module.exports = Education;
