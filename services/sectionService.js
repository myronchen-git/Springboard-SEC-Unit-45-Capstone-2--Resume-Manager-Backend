'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Section = require('../models/section');
const Document_X_Section = require('../models/document_x_section');
const {
  validateDocumentOwner,
  getLastPosition,
} = require('../util/serviceHelpers');

const { BadRequestError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Creates a document_x_section record (document-section relationship) in the
 * database.  The document owner is first verified, then the next position is
 * found by getting all document_x_section records.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document that is having a section
 *  attach to it.
 * @param {Number} sectionId - ID of the section to attach to the document.
 * @returns {Document_X_Section} A Document_X_Section instance that contains the
 *  document-section relationship data.
 */
async function createDocument_x_section(username, documentId, sectionId) {
  const logPrefix =
    `${fileName}.createDocument_x_section(` +
    `username = "${username}", ` +
    `docId = ${documentId}, ` +
    `sectionId = ${sectionId})`;
  logger.verbose(logPrefix);

  await validateDocumentOwner(username, documentId, logPrefix);

  const documents_x_sections = await Document_X_Section.getAll(documentId);
  const nextPosition = getLastPosition(documents_x_sections) + 1;

  try {
    return await Document_X_Section.add({
      documentId,
      sectionId,
      position: nextPosition,
    });
  } catch (err) {
    // PostgreSQL error code 23505 is for unique constraint violation.
    if (err.code === '23505') {
      logger.error(`${logPrefix}: Relationship already exists.`);
      throw new BadRequestError(
        'Can not add section to document, as it already exists.'
      );
    } else {
      throw err;
    }
  }
}

/**
 * Gets all sections belonging to a document.  Document ownership is first
 * verified.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document to get sections from.
 * @returns {Section[]} A list of Section instances, in order of position.
 */
async function getSections(username, documentId) {
  const logPrefix =
    `${fileName}.getSections(` +
    `username = "${username}", ` +
    `documentId = ${documentId})`;
  logger.verbose(logPrefix);

  await validateDocumentOwner(username, documentId, logPrefix);

  return await Section.getAllInDocument(documentId);
}

/**
 * Changes the order of the sections in a document.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document that is having its sections
 *  reordered.
 * @param {Number[]} sectionIds - List of sections IDs with the desired
 *  ordering.
 * @returns {Section[]} A list of Section instances, in order of position.
 */
async function updateDocument_x_sectionPositions(
  username,
  documentId,
  sectionIds
) {
  const logPrefix =
    `${fileName}.updateDocument_x_sectionPositions(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `sectionIds = [${sectionIds}])`;
  logger.verbose(logPrefix);

  await validateDocumentOwner(username, documentId, logPrefix);

  // Verify that sectionIds contains all of the sections in the document.
  const documents_x_sections = await Document_X_Section.getAll(documentId);
  if (
    documents_x_sections.length !== sectionIds.length ||
    !documents_x_sections.every((dxs) => sectionIds.includes(dxs.sectionId))
  ) {
    logger.error(
      `${logPrefix}: Provided section IDs do not exactly ` +
        'match those in document.'
    );
    throw new BadRequestError(
      'All sections, and only those, need to be included ' +
        'when updating their positions in a document.'
    );
  }

  await Document_X_Section.updateAllPositions(documentId, sectionIds);

  return await Section.getAllInDocument(documentId);
}

/**
 * Deletes a document-section relationship.  Document ownership is first
 * verified.
 *
 * @param {String} username - Name of user that wants to delete the
 *  document-section relationship.  This should be the owner.
 * @param {Number} documentId - ID of the document to remove the section from.
 * @param {Number} sectionId - ID of the section to be removed.
 */
async function deleteDocument_x_section(username, documentId, sectionId) {
  const logPrefix =
    `${fileName}.deleteDocument_x_section(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `sectionId = ${sectionId})`;
  logger.verbose(logPrefix);

  await validateDocumentOwner(username, documentId, logPrefix);

  await Document_X_Section.delete(documentId, sectionId);
}

// ==================================================

module.exports = {
  createDocument_x_section,
  getSections,
  updateDocument_x_sectionPositions,
  deleteDocument_x_section,
};
