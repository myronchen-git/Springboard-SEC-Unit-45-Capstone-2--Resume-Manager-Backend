'use strict';

const Relationship = require('./relationship');

const { camelToSnakeCase } = require('../util/caseConversions');

// ==================================================

/**
 * Represents a document and section relationship.
 */
class Document_X_Section extends Relationship {
  static tableName = 'documents_x_sections';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    document_id AS "documentId",
    section_id AS "sectionId",
    position`;

  constructor(documentId, sectionId, position) {
    super();
    this.documentId = documentId;
    this.sectionId = sectionId;
    this.position = position;
  }

  /**
   * Creates a new document_x_section entry in the database.
   *
   * @param {Object} props - Contains data for creating a new
   *  document_x_section.
   * @param {String} props.documentId - ID of the document.
   * @param {String} props.sectionId - ID of the section.
   * @param {Number} props.position - Position of section among other sections
   *  in the document.
   * @returns {Document_X_Section} A new Document_X_Section instance that
   *  contains the document_x_section's data.
   */
  static async add(props) {
    // Allowed properties/attributes.
    const { documentId, sectionId, position } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${Document_X_Section.tableName} (
    document_id,
    section_id,
    position
  )
  VALUES ($1, $2, $3)
  RETURNING ${Document_X_Section._allDbColsAsJs};`,
      values: [documentId, sectionId, position],
    };

    const notFoundMessage =
      'Document or section was not found.  ' +
      `Document ID: ${documentId}, ` +
      `section ID: ${sectionId}.`;

    return await super.add(props, queryConfig, notFoundMessage);
  }

  /**
   * Retrieves all the documents_x_sections belonging to a document.
   *
   * @param {Number} documentId - ID of the document to get the
   *  documents_x_sections for.
   * @returns {Document_X_Section[]} A list of Document_X_Section instances,
   *  ordered by position.
   */
  static async getAll(documentId) {
    const queryConfig = {
      text: `
  SELECT ${Document_X_Section._allDbColsAsJs}
  FROM ${Document_X_Section.tableName}
  WHERE document_id = $1
  ORDER BY position;`,
      values: [documentId],
    };

    return await super.getAll(documentId, queryConfig);
  }

  /**
   * Retrieves a specific document_x_section by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific document_x_section.
   * @param {Number} [queryParams.documentId] - Document ID of the
   *  document_x_section.
   * @param {String} [queryParams.sectionId] - Section ID of the
   *  document_x_section.
   * @returns {Document_X_Section} A new Document_X_Section instance that
   *  contains the document_x_section's data.
   */
  static async get(queryParams) {
    // Allowed parameters.
    const { documentId, sectionId } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Document_X_Section._allDbColsAsJs}
  FROM ${Document_X_Section.tableName}
  WHERE document_id = $1 AND section_id = $2;`,
      values: [documentId, sectionId],
    };

    const notFoundMessage =
      'Can not find document-section relation with ' +
      `document ID ${documentId} and section ID ${sectionId}.`;

    return await super.get(queryParams, queryConfig, notFoundMessage);
  }

  /**
   * Updates the positions of all sections in a document.
   *
   * @param {Number} documentId - ID of the document that is having its sections
   *  reordered.
   * @param {Number[]} sectionIds - List of sections IDs with the desired
   *  ordering.
   * @returns {Document_X_Section[]} A list of Document_X_Section instances.
   */
  static async updateAllPositions(documentId, sectionIds) {
    let name = 'documentId';
    const attachTo = {
      jsName: name,
      sqlName: camelToSnakeCase(name),
      id: documentId,
    };

    name = 'sectionId';
    const attachWiths = {
      jsName: name,
      sqlName: camelToSnakeCase(name),
      ids: sectionIds,
    };

    return await super.updateAllPositions(attachTo, attachWiths);
  }

  /**
   * Updates a document_x_section with a new position.  Throws a BadRequestError
   * if position is invalid.
   *
   * @param {Number} position - New position for this document_x_section.
   * @returns {Document_X_Section} The same Document_X_Section instance that
   *  this method was called on, but with updated property values.
   */
  async update(position) {
    const queryConfig = {
      text: `
  UPDATE ${Document_X_Section.tableName}
  SET position = $1
  WHERE document_id = $2 AND section_id = $3
  RETURNING ${Document_X_Section._allDbColsAsJs};`,
      values: [position, this.documentId, this.sectionId],
    };

    const instanceArgsForLog =
      `documentId = ${this.documentId}, ` + `sectionId = ${this.sectionId}`;

    const notFoundLog =
      'Document_X_Section with ' +
      `document ID ${this.documentId} and ` +
      `section ID ${this.sectionId} was not found.`;

    const serverErrorMessage =
      `Document-section relation with document ID ${this.documentId} and ` +
      `section ID ${this.sectionId} was not found.`;

    return await super.update(
      position,
      queryConfig,
      instanceArgsForLog,
      notFoundLog,
      serverErrorMessage
    );
  }

  /**
   * Deletes a document_x_section entry in the database.
   *
   * @param {Number} documentId - ID of the document to remove the section from.
   * @param {Number} sectionId - ID of the section to be removed.
   */
  static async delete(documentId, sectionId) {
    const queryConfig = {
      text: `
  DELETE FROM ${Document_X_Section.tableName}
  WHERE document_id = $1 AND section_id = $2;`,
      values: [documentId, sectionId],
    };

    const deletedLog =
      'document_x_section(s) deleted: ' +
      `documentId = ${documentId}, sectionId = ${sectionId}.`;

    await super.delete(queryConfig, deletedLog);
  }

  /**
   * Deletes a document_x_section entry in the database.  Does not delete the
   * instance properties/fields.  Remember to delete the instance this belongs
   * to!
   */
  async delete() {
    await Document_X_Section.delete(this.documentId, this.sectionId);
  }
}

// ==================================================

module.exports = Document_X_Section;
