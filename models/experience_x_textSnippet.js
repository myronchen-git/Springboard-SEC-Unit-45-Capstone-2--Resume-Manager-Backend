'use strict';

const db = require('../database/db');

const Relationship = require('./relationship');

const { camelToSnakeCase } = require('../util/caseConversions');

const logger = require('../util/logger');

// ==================================================

/**
 * Represents an experience and text snippet relationship.
 */
class Experience_X_Text_Snippet extends Relationship {
  static tableName = 'experiences_x_text_snippets';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    document_x_experience_id AS "documentXExperienceId",
    text_snippet_id AS "textSnippetId",
    text_snippet_version AS "textSnippetVersion",
    position`;

  constructor(
    documentXExperienceId,
    textSnippetId,
    textSnippetVersion,
    position
  ) {
    super();
    this.documentXExperienceId = documentXExperienceId;
    this.textSnippetId = textSnippetId;
    this.textSnippetVersion = textSnippetVersion;
    this.position = position;
  }

  /**
   * Creates a new experience_x_text_snippet entry in the database.
   *
   * @param {Object} props - Contains data for creating a new
   *  experience_x_text_snippet.
   * @param {Number} props.documentXExperienceId - ID of the
   *  document_x_experience.
   * @param {Number} props.textSnippetId - ID of the text snippet.
   * @param {Date} props.textSnippetVersion - Version of the text snippet.
   * @param {Number} props.position - Position of text snippet among other text
   *  snippets in the experience in the document.
   * @returns {Promise<Experience_X_Text_Snippet>} A new
   *  Experience_X_Text_Snippet instance that contains the
   *  experience_x_text_snippet's data.
   */
  static async add(props) {
    // Allowed properties/attributes.
    const {
      documentXExperienceId,
      textSnippetId,
      textSnippetVersion,
      position,
    } = props;

    const queryConfig = {
      text: `
  INSERT INTO ${Experience_X_Text_Snippet.tableName} (
    document_x_experience_id,
    text_snippet_id,
    text_snippet_version,
    position
  )
  VALUES ($1, $2, $3, $4)
  RETURNING ${Experience_X_Text_Snippet._allDbColsAsJs};`,
      values: [
        documentXExperienceId,
        textSnippetId,
        textSnippetVersion,
        position,
      ],
    };

    const notFoundMessage =
      'Experience or text snippet was not found.  ' +
      `Document-experience ID: ${documentXExperienceId}, ` +
      `text snippet ID: ${textSnippetId}.`;

    return await super.add(props, queryConfig, notFoundMessage);
  }

  /**
   * Retrieves all the experiences_x_text_snippets belonging to an experience in
   * a document.
   *
   * @param {Number} documentXExperienceId - ID of the document-experience
   *  relationship to get the experiences_x_text_snippets for.
   * @returns {Promise<Experience_X_Text_Snippet[]>} A list of
   *  Experience_X_Text_Snippet instances.
   */
  static async getAll(documentXExperienceId) {
    const queryConfig = {
      text: `
  SELECT ${Experience_X_Text_Snippet._allDbColsAsJs}
  FROM ${Experience_X_Text_Snippet.tableName}
  WHERE document_x_experience_id = $1
  ORDER BY position;`,
      values: [documentXExperienceId],
    };

    return await super.getAll(documentXExperienceId, queryConfig);
  }

  /**
   * Retrieves a specific experience_x_text_snippet by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific experience_x_text_snippet.
   * @param {Number} queryParams.documentXExperienceId - Document-experience ID
   *  of the experience_x_text_snippet.
   * @param {Number} queryParams.textSnippetId - Text snippet ID of the
   *  experience_x_text_snippet.
   * @returns {Experience_X_Text_Snippet} A new Experience_X_Text_Snippet
   *  instance that contains the experience_x_text_snippet's data.
   */
  static async get(queryParams) {
    // Allowed parameters.
    const { documentXExperienceId, textSnippetId } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Experience_X_Text_Snippet._allDbColsAsJs}
  FROM ${Experience_X_Text_Snippet.tableName}
  WHERE document_x_experience_id = $1 AND text_snippet_id = $2;`,
      values: [documentXExperienceId, textSnippetId],
    };

    const notFoundMessage =
      'Can not find experience-text snippet relation with ' +
      `document-experience ID ${documentXExperienceId} ` +
      `and text snippet ID ${textSnippetId}.`;

    return await super.get(queryParams, queryConfig, notFoundMessage);
  }

  /**
   * Updates a experience_x_text_snippet with a new position.  Throws a
   * BadRequestError if position is invalid.
   *
   * @param {Number} position - New position for this experience_x_text_snippet.
   * @returns {Promise<Experience_X_Text_Snippet>} The same
   *  Experience_X_Text_Snippet instance that this method was called on, but
   *  with updated property values.
   */
  async update(position) {
    const queryConfig = {
      text: `
  UPDATE ${Experience_X_Text_Snippet.tableName}
  SET position = $1
  WHERE document_x_experience_id = $2 AND text_snippet_id = $3
  RETURNING ${Experience_X_Text_Snippet._allDbColsAsJs};`,
      values: [position, this.documentXExperienceId, this.textSnippetId],
    };

    const instanceArgsForLog =
      `documentXExperienceId = ${this.documentXExperienceId}, ` +
      `textSnippetId = ${this.textSnippetId}`;

    const notFoundLog =
      'Experience_X_Text_Snippet with ' +
      `document-experience ID ${this.documentXExperienceId} and ` +
      `text snippet ID ${this.textSnippetId} was not found.`;

    const serverErrorMessage =
      'Experience-text snippet relation with ' +
      `document-experience ID ${this.documentXExperienceId} and ` +
      `text snippet ID ${this.textSnippetId} was not found.`;

    return await super.update(
      position,
      queryConfig,
      instanceArgsForLog,
      notFoundLog,
      serverErrorMessage
    );
  }

  /**
   * Updates the positions of all text snippets in an experience in a document.
   *
   * @param {Number} documentXExperienceId - ID of the document-experience
   *  relationship that is having its text snippets reordered.
   * @param {Number[]} textSnippetIds - List of text snippets IDs with the
   *  desired ordering.
   * @returns {Promise<Experience_X_Text_Snippet[]>} A list of
   *  Experience_X_Text_Snippet instances.
   */
  static async updateAllPositions(documentXExperienceId, textSnippetIds) {
    let name = 'documentXExperienceId';
    const attachTo = {
      jsName: name,
      sqlName: camelToSnakeCase(name),
      id: documentXExperienceId,
    };

    name = 'textSnippetId';
    const attachWiths = {
      jsName: name,
      sqlName: camelToSnakeCase(name),
      ids: textSnippetIds,
    };

    return await super.updateAllPositions(attachTo, attachWiths);
  }

  /**
   * Replaces all text snippet versions in all experiences_x_text_snippets. This
   * is used in conjunction with updating a text snippet to allow all references
   * to be updated as well, so that when retrieving an experience's text
   * snippets, the correct text snippets are shown.
   *
   * @param {Number} textSnippetId - ID of the text snippet to be replaced.
   * @param {Date | String} oldTextSnippetVersion - Version of the text snippet
   *  to be replaced.
   * @param {Date | String} newTextSnippetVersion - Newer version of the text
   *  snippet that is replacing.
   * @returns {Promise<Number>} Number of text snippets updated.
   */
  static async replaceTextSnippet(
    textSnippetId,
    oldTextSnippetVersion,
    newTextSnippetVersion
  ) {
    const logPrefix =
      `${this.name}.replaceTextSnippet(` +
      `textSnippetId = ${textSnippetId}, ` +
      `oldTextSnippetVersion = "${oldTextSnippetVersion}", ` +
      `newTextSnippetVersion = "${newTextSnippetVersion}")`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  UPDATE ${Experience_X_Text_Snippet.tableName}
  SET text_snippet_version = $1
  WHERE text_snippet_id = $2 AND text_snippet_version = $3;`,
      values: [newTextSnippetVersion, textSnippetId, oldTextSnippetVersion],
    };

    const result = await db.query({ queryConfig, logPrefix });

    logger.verbose(`${logPrefix}: ${result.rowCount} replaced.`);

    return result.rowCount;
  }

  /**
   * Deletes a experience_x_text_snippet entry in the database.
   *
   * @param {Number} documentXExperienceId - ID of the documents_x_experiences
   *  to remove the text snippet from.
   * @param {Number} textSnippetId - ID of the text snippet to be removed.
   */
  static async delete(documentXExperienceId, textSnippetId) {
    const queryConfig = {
      text: `
  DELETE FROM ${Experience_X_Text_Snippet.tableName}
  WHERE document_x_experience_id = $1 AND text_snippet_id = $2;`,
      values: [documentXExperienceId, textSnippetId],
    };

    const deletedLog =
      'experience_x_text_snippet(s) deleted: ' +
      `documentXExperienceId = ${documentXExperienceId}, ` +
      `textSnippetId = ${textSnippetId}.`;

    await super.delete(queryConfig, deletedLog);
  }

  /**
   * Deletes a experience_x_text_snippet entry in the database.  Does not delete
   * the instance properties/fields.  Remember to delete the instance this
   * belongs to!
   */
  async delete() {
    await Experience_X_Text_Snippet.delete(this.documentId, this.educationId);
  }
}

// ==================================================

module.exports = Experience_X_Text_Snippet;
