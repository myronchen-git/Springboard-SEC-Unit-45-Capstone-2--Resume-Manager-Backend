'use strict';

const Relationship = require('./relationship');

// ==================================================

/**
 * Represents a document and skill relationship.
 */
class Document_X_Skill extends Relationship {
  static tableName = 'documents_x_skills';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    document_id AS "documentId",
    skill_id AS "skillId"`;

  constructor(documentId, skillId) {
    super();
    this.documentId = documentId;
    this.skillId = skillId;
  }

  /**
   * Creates a new document_x_skill entry in the database.
   *
   * @param {Object} props - Contains data for creating a new document_x_skill.
   * @param {String} props.documentId - ID of the document.
   * @param {String} props.skillId - ID of the skill.
   * @returns {Document_X_Skill} A new Document_X_Skill instance that contains
   *  the document_x_skill's data.
   */
  static async add(props) {
    // Allowed properties/attributes.
    const { documentId, skillId } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${Document_X_Skill.tableName} (
    document_id,
    skill_id
  )
  VALUES ($1, $2)
  RETURNING ${Document_X_Skill._allDbColsAsJs};`,
      values: [documentId, skillId],
    };

    const notFoundMessage =
      'Document or skill was not found.  ' +
      `Document ID: ${documentId}, ` +
      `skill ID: ${skillId}.`;

    return await super.add(props, queryConfig, notFoundMessage);
  }

  /**
   * Retrieves all the documents_x_skills belonging to a document.
   *
   * @param {Number} documentId - ID of the document to get the
   *  documents_x_skills for.
   * @returns {Document_X_Skill[]} A list of Document_X_Skill instances.
   */
  static async getAll(documentId) {
    const queryConfig = {
      text: `
  SELECT ${Document_X_Skill._allDbColsAsJs}
  FROM ${Document_X_Skill.tableName}
  WHERE document_id = $1;`,
      values: [documentId],
    };

    return await super.getAll(documentId, queryConfig);
  }

  /**
   * Retrieves a specific document_x_skill by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific document_x_skill.
   * @param {Number} queryParams.documentId - Document ID of the
   *  document_x_skill.
   * @param {Number} queryParams.skillId - Skill ID of the
   *  document_x_skill.
   * @returns {Document_X_Skill} A new Document_X_Skill instance that
   *  contains the document_x_skill's data.
   */
  static async get(queryParams) {
    // Allowed parameters.
    const { documentId, skillId } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Document_X_Skill._allDbColsAsJs}
  FROM ${Document_X_Skill.tableName}
  WHERE document_id = $1 AND skill_id = $2;`,
      values: [documentId, skillId],
    };

    const notFoundMessage =
      'Can not find document-skill relation with ' +
      `document ID ${documentId} and skill ID ${skillId}.`;

    return await super.get(queryParams, queryConfig, notFoundMessage);
  }

  /**
   * Deletes a document_x_skill entry in the database.
   *
   * @param {Number} documentId - ID of the document to remove the skill from.
   * @param {Number} skillId - ID of the skill to be removed.
   */
  static async delete(documentId, skillId) {
    const queryConfig = {
      text: `
  DELETE FROM ${Document_X_Skill.tableName}
  WHERE document_id = $1 AND skill_id = $2;`,
      values: [documentId, skillId],
    };

    const deletedLog =
      'document_x_skill(s) deleted: ' +
      `documentId = ${documentId}, skillId = ${skillId}.`;

    await super.delete(queryConfig, deletedLog);
  }

  /**
   * Deletes a document_x_skill entry in the database.  Does not delete the
   * instance properties/fields.  Remember to delete the instance this belongs
   * to!
   */
  async delete() {
    await Document_X_Skill.delete(this.documentId, this.skillId);
  }
}

// ==================================================

module.exports = Document_X_Skill;
