'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const Education = require('../models/education');
const Document_X_Education = require('../models/document_x_education');
const {
  validateOwnership,
  getLastPosition,
} = require('../util/serviceHelpers');

const { BadRequestError, ForbiddenError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Creates an education and document-education relationship entry in the
 * database.  The new education will be positioned after the last, or highest
 * value position, education in the document.
 *
 * Note that, currently, educations can only be added to the master resume. This
 * can be changed in the future.
 *
 * Document ownership is first verified.
 *
 * @param {String} username - Name of user that wants to add an education to the
 *  document.
 * @param {Number} documentId - ID of the document that is being attached with
 *  an education.
 * @param {Object} props - Properties of the education to add.
 * @returns {{
 *    education: Education,
 *    document_x_education: Document_X_Education
 *  }}
 *  An Object containing an Education instance that contains the saved data
 *  and a Document_X_Education instance that contains the document-education
 *  relationship data.
 */
async function createEducation(username, documentId, props) {
  const logPrefix =
    `${fileName}.createEducation(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `props = ${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  // Verify document ownership and if document is master.
  const document = await validateOwnership(
    Document,
    username,
    { id: documentId },
    logPrefix
  );

  if (!document.isMaster) {
    logger.error(
      `${logPrefix}: User attempted to add an education not to the master resume.`
    );
    throw new ForbiddenError(
      'Educations can only be added to the master resume.'
    );
  }

  // Create education.
  const education = await Education.add({ ...props, owner: username });

  // Find next position.
  const documents_x_educations = await Document_X_Education.getAll(documentId);
  const nextPosition = getLastPosition(documents_x_educations) + 1;

  // Create document-education relationship.
  const document_x_education = await Document_X_Education.add({
    documentId,
    educationId: education.id,
    position: nextPosition,
  });

  return { education, document_x_education };
}

/**
 * Creates a document_x_education record (document-education relationship) in
 * the database.  Education and document ownership are verified, then the next
 * position is found by getting all document_x_education records.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document that is having an education
 *  attach to it.
 * @param {Number} educationId - ID of the education to attach to the document.
 * @returns {Document_X_Education} A Document_X_Education instance that contains
 *  the document-education relationship data.
 */
async function createDocument_x_education(username, documentId, educationId) {
  const logPrefix =
    `${fileName}.createDocument_x_education(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `educationId = ${educationId})`;
  logger.verbose(logPrefix);

  // Verify ownership.
  await validateOwnership(Education, username, { id: educationId }, logPrefix);
  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  // Find next proper position to place education in.
  const documents_x_educations = await Document_X_Education.getAll(documentId);
  const nextPosition = getLastPosition(documents_x_educations) + 1;

  // Add relationship.
  try {
    return await Document_X_Education.add({
      documentId,
      educationId,
      position: nextPosition,
    });
  } catch (err) {
    // PostgreSQL error code 23505 is for unique constraint violation.
    if (err.code === '23505') {
      logger.error(`${logPrefix}: Relationship already exists.`);
      throw new BadRequestError(
        'Can not add education to document, as it already exists.'
      );
    } else {
      throw err;
    }
  }
}

/**
 * Verifies that an education belongs to the specified user.  Checks if the
 * education is being updated in the master resume.  Then updates the education.
 *
 * @param {String} username - Name of user that wants to update the education.
 * @param {Number} documentId - ID of the document that the education belongs
 *  to.
 * @param {Number} educationId - ID of the education to update.
 * @param {Object} props - Properties of the education to be updated.  See route
 *  for full list.
 * @returns {Education} An Education instance containing the updated info.
 * @throws {ForbiddenError} If the education does not belong to the user or if
 *  the document is not the master resume.
 */
async function updateEducation(username, documentId, educationId, props) {
  const logPrefix =
    `${fileName}.updateEducation(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `educationId = ${educationId}), ` +
    `props = ${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  // Verify ownership.
  const education = await validateOwnership(
    Education,
    username,
    { id: educationId },
    logPrefix
  );
  const document = await validateOwnership(
    Document,
    username,
    { id: documentId },
    logPrefix
  );

  // Verify that document is master.
  if (!document.isMaster) {
    logger.error(
      `${logPrefix}: User attempted to update education not in master resume.`
    );
    throw new ForbiddenError(
      'Educations can only be updated in the master resume.'
    );
  }

  // Update education.
  return await education.update(props);
}

/**
 * Changes the order of the educations in a document.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document that is having its educations
 *  reordered.
 * @param {Number[]} educationIds - List of educations IDs with the desired
 *  ordering.
 * @returns {Education[]} A list of Education instances, in order of position.
 */
async function updateDocument_x_educationPositions(
  username,
  documentId,
  educationIds
) {
  const logPrefix =
    `${fileName}.updateDocument_x_educationPositions(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `educationIds = ${educationIds})`;
  logger.verbose(logPrefix);

  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  // Verify that educationIds contains all of the educations in the document.
  const documents_x_educations = await Document_X_Education.getAll(documentId);
  if (
    documents_x_educations.length !== educationIds.length ||
    !documents_x_educations.every((dxe) =>
      educationIds.includes(dxe.educationId)
    )
  ) {
    logger.error(
      `${logPrefix}: Provided education IDs do not exactly ` +
        'match those in document.'
    );
    throw new BadRequestError(
      'All educations, and only those, need to be included ' +
        'when updating their positions in a document.'
    );
  }

  await Document_X_Education.updateAllPositions(documentId, educationIds);

  return await Education.getAllInDocument(documentId);
}

/**
 * Deletes a document-education relationship.  Document ownership is first
 * verified.
 *
 * @param {String} username - Name of user that wants to delete the
 *  document-education relationship.  This should be the owner.
 * @param {Number} documentId - ID of the document to remove the education from.
 * @param {Number} educationId - ID of the education to be removed.
 */
async function deleteDocument_x_education(username, documentId, educationId) {
  const logPrefix =
    `${fileName}.deleteDocument_x_education(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `educationId = ${educationId})`;
  logger.verbose(logPrefix);

  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  await Document_X_Education.delete(documentId, educationId);
}

/**
 * Deletes an education.
 *
 * @param {String} username - Name of user that wants to delete the education.
 *  This should be the owner.
 * @param {Number} educationId - ID of the education to be deleted.
 */
async function deleteEducation(username, educationId) {
  const logPrefix =
    `${fileName}.deleteEducation(` +
    `username = "${username}", ` +
    `educationId = ${educationId})`;
  logger.verbose(logPrefix);

  const education = await validateOwnership(
    Education,
    username,
    { id: educationId },
    logPrefix
  );

  await education.delete();
}

// ==================================================

module.exports = {
  createEducation,
  createDocument_x_education,
  updateEducation,
  updateDocument_x_educationPositions,
  deleteDocument_x_education,
  deleteEducation,
};
