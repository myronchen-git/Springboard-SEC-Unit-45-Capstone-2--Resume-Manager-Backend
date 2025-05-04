'use strict';

const Relationship = require('./relationship');

const { camelToSnakeCase } = require('../util/caseConversions');

// ==================================================

/**
 * Represents a document and education relationship.
 */
class Document_X_Education extends Relationship {
  static tableName = 'documents_x_educations';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    document_id AS "documentId",
    education_id AS "educationId",
    position`;

  constructor(documentId, educationId, position) {
    super();
    this.documentId = documentId;
    this.educationId = educationId;
    this.position = position;
  }

  /**
   * Creates a new document_x_education entry in the database.
   *
   * @param {Object} props - Contains data for creating a new
   *  document_x_education.
   * @param {Number} props.documentId - ID of the document.
   * @param {Number} props.educationId - ID of the education.
   * @param {Number} props.position - Position of education among other
   *  educations in the document.
   * @returns {Promise<Document_X_Education>} A new Document_X_Education
   *  instance that contains the document_x_education's data.
   */
  static async add(props) {
    // Allowed properties/attributes.
    const { documentId, educationId, position } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${Document_X_Education.tableName} (
    document_id,
    education_id,
    position
  )
  VALUES ($1, $2, $3)
  RETURNING ${Document_X_Education._allDbColsAsJs};`,
      values: [documentId, educationId, position],
    };

    const notFoundMessage =
      'Document or education was not found.  ' +
      `Document ID: ${documentId}, ` +
      `education ID: ${educationId}.`;

    return await super.add(props, queryConfig, notFoundMessage);
  }

  /**
   * Retrieves all the documents_x_educations belonging to a document.
   *
   * @param {Number} documentId - ID of the document to get the
   *  documents_x_educations for.
   * @returns {Promise<Document_X_Education[]>} A list of Document_X_Education
   *  instances.
   */
  static async getAll(documentId) {
    const queryConfig = {
      text: `
  SELECT ${Document_X_Education._allDbColsAsJs}
  FROM ${Document_X_Education.tableName}
  WHERE document_id = $1
  ORDER BY position;`,
      values: [documentId],
    };

    return await super.getAll(documentId, queryConfig);
  }

  /**
   * Retrieves a specific document_x_education by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific document_x_education.
   * @param {Number} queryParams.documentId - Document ID of the
   *  document_x_education.
   * @param {Number} queryParams.educationId - Education ID of the
   *  document_x_education.
   * @returns {Promise<Document_X_Education>} A new Document_X_Education
   *  instance that contains the document_x_education's data.
   */
  static async get(queryParams) {
    // Allowed parameters.
    const { documentId, educationId } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Document_X_Education._allDbColsAsJs}
  FROM ${Document_X_Education.tableName}
  WHERE document_id = $1 AND education_id = $2;`,
      values: [documentId, educationId],
    };

    const notFoundMessage =
      'Can not find document-education relation with ' +
      `document ID ${documentId} and education ID ${educationId}.`;

    return await super.get(queryParams, queryConfig, notFoundMessage);
  }

  /**
   * Updates a document_x_education with a new position.  Throws a
   * BadRequestError if position is invalid.
   *
   * @param {Number} position - New position for this document_x_education.
   * @returns {Promise<Document_X_Education>} The same Document_X_Education
   *  instance that this method was called on, but with updated property values.
   */
  async update(position) {
    const queryConfig = {
      text: `
  UPDATE ${Document_X_Education.tableName}
  SET position = $1
  WHERE document_id = $2 AND education_id = $3
  RETURNING ${Document_X_Education._allDbColsAsJs};`,
      values: [position, this.documentId, this.educationId],
    };

    const instanceArgsForLog =
      `documentId = ${this.documentId}, ` + `educationId = ${this.educationId}`;

    const notFoundLog =
      'Document_X_Education with ' +
      `document ID ${this.documentId} and ` +
      `education ID ${this.educationId} was not found.`;

    const serverErrorMessage =
      `Document-education relation with document ID ${this.documentId} and ` +
      `education ID ${this.educationId} was not found.`;

    return await super.update(
      position,
      queryConfig,
      instanceArgsForLog,
      notFoundLog,
      serverErrorMessage
    );
  }

  /**
   * Updates the positions of all educations in a document.
   *
   * @param {Number} documentId - ID of the document that is having its
   *  educations reordered.
   * @param {Number[]} educationIds - List of educations IDs with the desired
   *  ordering.
   * @returns {Promise<Document_X_Education[]>} A list of Document_X_Education
   *  instances.
   */
  static async updateAllPositions(documentId, educationIds) {
    let name = 'documentId';
    const attachTo = {
      jsName: name,
      sqlName: camelToSnakeCase(name),
      id: documentId,
    };

    name = 'educationId';
    const attachWiths = {
      jsName: name,
      sqlName: camelToSnakeCase(name),
      ids: educationIds,
    };

    return await super.updateAllPositions(attachTo, attachWiths);
  }

  /**
   * Deletes a document_x_education entry in the database.
   *
   * @param {Number} documentId - ID of the document to remove the education
   *  from.
   * @param {Number} educationId - ID of the education to be removed.
   */
  static async delete(documentId, educationId) {
    const queryConfig = {
      text: `
  DELETE FROM ${Document_X_Education.tableName}
  WHERE document_id = $1 AND education_id = $2;`,
      values: [documentId, educationId],
    };

    const deletedLog =
      'document_x_education(s) deleted: ' +
      `documentId = ${documentId}, educationId = ${educationId}.`;

    await super.delete(queryConfig, deletedLog);
  }

  /**
   * Deletes a document_x_education entry in the database.  Does not delete the
   * instance properties/fields.  Remember to delete the instance this belongs
   * to!
   */
  async delete() {
    await Document_X_Education.delete(this.documentId, this.educationId);
  }
}

// ==================================================

module.exports = Document_X_Education;
