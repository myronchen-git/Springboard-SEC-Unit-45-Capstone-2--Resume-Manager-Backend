'use strict';

const Relationship = require('./relationship');

const { camelToSnakeCase } = require('../util/caseConversions');

// ==================================================

/**
 * Represents a document and experience relationship.
 */
class Document_X_Experience extends Relationship {
  static tableName = 'documents_x_experiences';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    id,
    document_id AS "documentId",
    experience_id AS "experienceId",
    position`;

  constructor(id, documentId, experienceId, position) {
    super();
    this.id = id;
    this.documentId = documentId;
    this.experienceId = experienceId;
    this.position = position;
  }

  /**
   * Creates a new document_x_experience entry in the database.
   *
   * @param {Object} props - Contains data for creating a new
   *  document_x_experience.
   * @param {Number} props.documentId - ID of the document.
   * @param {Number} props.experienceId - ID of the experience.
   * @param {Number} props.position - Position of experience among other
   *  experiences in the document.
   * @returns {Document_X_Experience} A new Document_X_Experience instance that
   *  contains the document_x_experience's data.
   */
  static async add(props) {
    // Allowed properties/attributes.
    const { documentId, experienceId, position } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${Document_X_Experience.tableName} (
    document_id,
    experience_id,
    position
  )
  VALUES ($1, $2, $3)
  RETURNING ${Document_X_Experience._allDbColsAsJs};`,
      values: [documentId, experienceId, position],
    };

    const notFoundMessage =
      'Document or experience was not found.  ' +
      `Document ID: ${documentId}, ` +
      `experience ID: ${experienceId}.`;

    return await super.add(props, queryConfig, notFoundMessage);
  }

  /**
   * Retrieves all the documents_x_experiences belonging to a document.
   *
   * @param {Number} documentId - ID of the document to get the
   *  documents_x_experiences for.
   * @returns {Document_X_Experience[]} A list of Document_X_Experience
   *  instances.
   */
  static async getAll(documentId) {
    const queryConfig = {
      text: `
  SELECT ${Document_X_Experience._allDbColsAsJs}
  FROM ${Document_X_Experience.tableName}
  WHERE document_id = $1
  ORDER BY position;`,
      values: [documentId],
    };

    return await super.getAll(documentId, queryConfig);
  }

  /**
   * Retrieves a specific document_x_experience by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific document_x_experience.
   * @param {Number} queryParams.documentId - Document ID of the
   *  document_x_experience.
   * @param {Number} queryParams.experienceId - Experience ID of the
   *  document_x_experience.
   * @returns {Document_X_Experience} A new Document_X_Experience instance that
   *  contains the document_x_experience's data.
   */
  static async get(queryParams) {
    // Allowed parameters.
    const { documentId, experienceId } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Document_X_Experience._allDbColsAsJs}
  FROM ${Document_X_Experience.tableName}
  WHERE document_id = $1 AND experience_id = $2;`,
      values: [documentId, experienceId],
    };

    const notFoundMessage =
      'Can not find document-experience relation with ' +
      `document ID ${documentId} and experience ID ${experienceId}.`;

    return await super.get(queryParams, queryConfig, notFoundMessage);
  }

  /**
   * Updates a document_x_experience with a new position.  Throws a
   * BadRequestError if position is invalid.
   *
   * @param {Number} position - New position for this document_x_experience.
   * @returns {Document_X_Experience} The same Document_X_Experience instance
   *  that this method was called on, but with updated property values.
   */
  async update(position) {
    const queryConfig = {
      text: `
  UPDATE ${Document_X_Experience.tableName}
  SET position = $1
  WHERE document_id = $2 AND experience_id = $3
  RETURNING ${Document_X_Experience._allDbColsAsJs};`,
      values: [position, this.documentId, this.experienceId],
    };

    const instanceArgsForLog =
      `documentId = ${this.documentId}, ` +
      `experienceId = ${this.experienceId}`;

    const notFoundLog =
      'Document_X_Experience with ' +
      `document ID ${this.documentId} and ` +
      `experience ID ${this.experienceId} was not found.`;

    const serverErrorMessage =
      `Document-experience relation with document ID ${this.documentId} and ` +
      `experience ID ${this.experienceId} was not found.`;

    return await super.update(
      position,
      queryConfig,
      instanceArgsForLog,
      notFoundLog,
      serverErrorMessage
    );
  }

  /**
   * Updates the positions of all experiences in a document.
   *
   * @param {Number} documentId - ID of the document that is having its
   *  experiences reordered.
   * @param {Number[]} experienceIds - List of experiences IDs with the desired
   *  ordering.
   * @returns {Document_X_Experience[]} A list of Document_X_Experience
   *  instances.
   */
  static async updateAllPositions(documentId, experienceIds) {
    let name = 'documentId';
    const attachTo = {
      jsName: name,
      sqlName: camelToSnakeCase(name),
      id: documentId,
    };

    name = 'experienceId';
    const attachWiths = {
      jsName: name,
      sqlName: camelToSnakeCase(name),
      ids: experienceIds,
    };

    return await super.updateAllPositions(attachTo, attachWiths);
  }

  /**
   * Deletes a document_x_experience entry in the database.
   *
   * @param {Number} documentId - ID of the document to remove the experience
   *  from.
   * @param {Number} experienceId - ID of the experience to be removed.
   */
  static async delete(documentId, experienceId) {
    const queryConfig = {
      text: `
  DELETE FROM ${Document_X_Experience.tableName}
  WHERE document_id = $1 AND experience_id = $2;`,
      values: [documentId, experienceId],
    };

    const deletedLog =
      'document_x_experience(s) deleted: ' +
      `documentId = ${documentId}, experienceId = ${experienceId}.`;

    await super.delete(queryConfig, deletedLog);
  }

  /**
   * Deletes a document_x_experience entry in the database.  Does not delete the
   * instance properties/fields.  Remember to delete the instance this belongs
   * to!
   */
  async delete() {
    await Document_X_Experience.delete(this.documentId, this.experienceId);
  }
}

// ==================================================

module.exports = Document_X_Experience;
