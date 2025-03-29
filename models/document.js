'use strict';

const db = require('../database/db');
const { convertPropsForSqlUpdate } = require('../util/sqlHelpers');

const {
  AppServerError,
  NotFoundError,
  ArgumentError,
} = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Represents a document.  This contains info about a document and not the
 * actual content.
 */
class Document {
  static tableName = 'documents';

  // To use in SQL statements to return all column data.  Ensure the properties
  // are in the same order and amount as constructor parameters.
  static _allDbColsAsJs = `
    id,
    document_name AS "documentName",
    owner,
    created_on AS "createdOn",
    last_updated AS "lastUpdated",
    is_master AS "isMaster",
    is_template AS "isTemplate",
    is_locked AS "isLocked"`;

  constructor(
    id,
    documentName,
    owner,
    createdOn,
    lastUpdated,
    isMaster,
    isTemplate,
    isLocked
  ) {
    this.id = id;
    this.documentName = documentName;
    this.owner = owner;
    this.createdOn = createdOn;
    this.lastUpdated = lastUpdated;
    this.isMaster = isMaster;
    this.isTemplate = isTemplate;
    this.isLocked = isLocked;
  }

  /**
   * Creates a new document entry in the database.
   *
   * @param {Object} docProps - Contains data for creating a new document.
   * @param {String} docProps.documentName - Name of the document.
   * @param {String} docProps.owner - Username that the document belongs to.
   * @param {Boolean} docProps.isMaster - If the document is the master
   *  resume.
   * @param {Boolean} docProps.isTemplate - If the document is a template.
   * @returns {Document} A new Document instance that contains the document's
   *  data.
   */
  static async add(docProps) {
    const logPrefix = `Document.add(${JSON.stringify(docProps)})`;
    logger.verbose(logPrefix);

    // Allowed properties/attributes.
    const { documentName, owner, isMaster, isTemplate } = docProps;

    const queryConfig = {
      text: `
  INSERT INTO ${Document.tableName} (
    document_name,
    owner,
    is_master,
    is_template
  ) VALUES ($1, $2, $3, $4)
  RETURNING ${Document._allDbColsAsJs};`,
      values: [documentName, owner, isMaster, isTemplate],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return new Document(...Object.values(result.rows[0]));
  }

  /**
   * Retrieves all the documents belonging to a user.
   *
   * @param {String} owner - Username to get the documents for.
   * @returns {Document[]} A list of Document instances.
   */
  static async getAll(owner) {
    const logPrefix = `Document.getAll(${owner})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT ${Document._allDbColsAsJs}
  FROM ${Document.tableName}
  WHERE owner = $1;`,
      values: [owner],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new Document(...Object.values(data)));
  }

  /**
   * Retrieves a specific document by ID or name.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific document.
   * @param {Number} [queryParams.id] - ID of the document.
   * @param {String} [queryParams.documentName] - Name of the document.
   * @returns {Document} A new Document instance that contains the document's
   *  data.
   */
  static async get(queryParams) {
    const logPrefix = `Document.get(${JSON.stringify(queryParams)})`;
    logger.verbose(logPrefix);

    // Allowed parameters.
    const { id, documentName } = queryParams;

    const queryConfig = {
      text: `
  SELECT ${Document._allDbColsAsJs}
  FROM ${Document.tableName}
  WHERE ${id == undefined ? 'document_name' : 'id'} = $1;`,
      values: [id == undefined ? documentName : id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rows.length === 0) {
      logger.error(`${logPrefix}: Document not found.`);
      throw new NotFoundError(
        `Can not find document with ID ${id} / name "${documentName}".`
      );
    }

    const data = result.rows[0];
    return new Document(...Object.values(data));
  }

  /**
   * Retrieves a full document and its contents.  This includes contact info,
   * sections, educations, experiences, etc..  Assumes that the document exists.
   *
   * @param {Number} documentId - ID of the document to get all the data from.
   * @returns {Object} All needed data to display a resume or template.
   */
  static async getDocumentAndSectionContent(documentId) {
    const logPrefix =
      'Document.getDocumentAndSectionContent(' + `documentId = ${documentId})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  SELECT d.id,
    d.document_name,
    d.created_on,
    d.last_updated,
    d.is_master,
    d.is_template,
    d.is_locked,
    (
      SELECT json_build_object(
          'full_name', ci.full_name,
          'location', ci.location,
          'email', ci.email,
          'phone', ci.phone,
          'linkedin', ci.linkedin,
          'github', ci.github
        ) AS contact_info
      FROM contact_info AS ci
      WHERE ci.username = d.owner
    ),
    (
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'section_name', s.section_name
        )
        ORDER BY dxs.position
      ) AS sections
      FROM documents_x_sections AS dxs
      JOIN sections AS s
      ON dxs.section_id = s.id
      WHERE dxs.document_id = $1
    ),
    (
      SELECT json_agg(
        json_build_object(
          'id', ed.id,
          'school', ed.school,
          'location', ed.location,
          'start_date', ed.start_date,
          'end_date', ed.end_date,
          'degree', ed.degree,
          'gpa', ed.gpa,
          'awards_and_honors', ed.awards_and_honors,
          'activities', ed.activities
        )
        ORDER BY dxed.position
      ) AS educations
      FROM documents_x_educations AS dxed
      JOIN educations AS ed
      ON dxed.education_id = ed.id
      WHERE dxed.document_id = $1
    ),
    (
      SELECT json_agg(
        json_build_object(
          'id', ex.id,
          'title', ex.title,
          'organization', ex.organization,
          'location', ex.location,
          'start_date', ex.start_date,
          'end_date', ex.end_date,
          'bullets', (
            SELECT json_agg(
              json_build_object(
                'id', t.id,
                'version', t.version,
                'parent', t.parent,
                'type', t.type,
                'content', t.content
              )
              ORDER BY ext.position
            )
            FROM experiences_x_text_snippets AS ext
            JOIN text_snippets AS t
            ON ext.text_snippet_id = t.id
            AND ext.text_snippet_version = t.version
            WHERE dxex.id = ext.document_x_experience_id)
        )
        ORDER BY dxex.position
      ) AS experiences
      FROM documents_x_experiences AS dxex
      JOIN experiences AS ex
      ON dxex.experience_id = ex.id
      WHERE dxex.document_id = $1
    )
  FROM documents AS d
  WHERE d.id = $1;`,
      values: [documentId],
    };

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows[0];
  }

  /**
   * Updates a document entry with new properties.
   *
   * @param {Number} id - Document ID given by the database.
   * @param {Object} docProps - Contains the updated properties.
   * @param {String} [docProps.documentName] - The new name of the document.
   * @param {Boolean} [docProps.isMaster] - The new value for whether this
   *  document is the master resume.
   * @param {Boolean} [docProps.isTemplate] - The new value for whether this
   *  document is a template.
   * @param {Boolean} [docProps.isLocked] - The new value for whether this
   *  document is locked.
   * @param {String} [oldDocumentName] - The document name before the update,
   *  used only for better error messages.
   * @returns {Document} A new Document instance that contains the updated
   *  document info.
   * @throws {ArgumentError} If docProps does not contain any valid properties.
   * @throws {NotFoundError} If the document does not exist.
   */
  static async update(id, docProps, oldDocumentName) {
    const logPrefix =
      'Document.update(' +
      `id = ${id}, ` +
      `docProps = ${JSON.stringify(docProps)}, ` +
      `oldDocumentName = "${oldDocumentName}")`;
    logger.verbose(logPrefix);

    // Processing document properties.
    const allowedProps = ['documentName', 'isMaster', 'isTemplate', 'isLocked'];
    const filteredProps = Object.fromEntries(
      Object.entries(docProps).filter((prop) => allowedProps.includes(prop[0]))
    );

    // If given no arguments, throw an Error.
    if (!Object.keys(filteredProps).length) {
      const errorMessage = 'There are no valid properties for updating.';
      logger.error(`${logPrefix}: ${errorMessage}`);
      throw new ArgumentError(errorMessage);
    }

    // Making update to database.
    const [sqlSubstring, sqlValues] = convertPropsForSqlUpdate(filteredProps);

    const queryConfig = {
      text: `
  UPDATE ${Document.tableName}
  SET ${sqlSubstring}
    last_updated = (NOW() at time zone 'utc')
  WHERE id = $${sqlValues.length + 1}
  RETURNING ${Document._allDbColsAsJs};`,
      values: [...sqlValues, id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    // If no database table rows were affected, then the document was not found.
    if (result.rowCount === 0) {
      const errorMessage = `Document ID ${id} ${
        oldDocumentName ? 'with name "' + oldDocumentName + '" ' : ''
      }was not found.`;

      logger.error(`${logPrefix}: ${errorMessage}`);
      throw new NotFoundError(errorMessage);
    }

    // Returning a Document Object.
    return new Document(...Object.values(result.rows[0]));
  }

  /**
   * Updates a document with new properties.  If no properties are passed, then
   * the document is not updated.
   *
   * @param {Object} docProps - Contains the updated properties.
   * @returns {Document} The same Document instance that this method was called
   *  on, but with updated property values.
   * @throws {AppServerError} If the document that this instance represents has
   *  already been deleted.
   */
  async update(docProps) {
    let document;
    try {
      document = await Document.update(this.id, docProps, this.documentName);
    } catch (err) {
      if (err instanceof ArgumentError) {
        // If given no arguments, return.
        return this;
      } else if (err instanceof NotFoundError) {
        // If document is not found, then this Document instance is stale and
        // represents a deleted document.
        throw new AppServerError(err.message);
      } else {
        throw err;
      }
    }

    // Update current instance's properties.
    Object.entries(document).forEach(([colName, val]) => {
      this[colName] = val;
    });

    return this;
  }

  /**
   * Deletes a document entry in the database.
   *
   * @param {Number} id - Document ID of the document to delete.
   */
  static async delete(id) {
    const logPrefix = `Document.delete(id = ${id})`;
    logger.verbose(logPrefix);

    const queryConfig = {
      text: `
  DELETE FROM ${Document.tableName}
  WHERE id = $1;`,
      values: [id],
    };

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(
        `${logPrefix}: ${result.rowCount} document(s) deleted: id = ${id}.`
      );
    } else {
      logger.info(`${logPrefix}: 0 documents deleted.`);
    }
  }

  /**
   * Deletes a document entry in the database.  Does not delete the instance
   * properties/fields.  Remember to delete the instance this belongs to!
   */
  async delete() {
    await Document.delete(this.id);
  }
}

// ==================================================

module.exports = Document;
