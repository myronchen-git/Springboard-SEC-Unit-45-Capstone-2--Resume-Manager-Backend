'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const Experience = require('../models/experience');
const Document_X_Experience = require('../models/document_x_experience');
const {
  validateOwnership,
  getLastPosition,
  transformObjectEmptyStringValuesIntoNulls,
} = require('../util/serviceHelpers');

const { BadRequestError, ForbiddenError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Creates an experience and document-experience relationship entry in the
 * database.  The new experience will be positioned after the last, or highest
 * value position, experience in the document.
 *
 * Note that, currently, experiences can only be added to the master resume.
 * This can be changed in the future.
 *
 * Document ownership is first verified.
 *
 * @param {String} username - Name of user that wants to add an experience to
 *  the document.
 * @param {Number} documentId - ID of the document that is being attached with
 *  an experience.
 * @param {Object} props - Properties of the experience to add.
 * @returns {{
 *    experience: Experience,
 *    document_x_experience: Document_X_Experience
 *  }}
 *  An Object containing an Experience instance that contains the saved data
 *  and a Document_X_Experience instance that contains the document-experience
 *  relationship data.
 */
async function createExperience(username, documentId, props) {
  const logPrefix =
    `${fileName}.createExperience(` +
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
      `${logPrefix}: User attempted to add an experience ` +
        'not to the master resume.'
    );
    throw new ForbiddenError(
      'Experiences can only be added to the master resume.'
    );
  }

  // Create experience.
  const experience = await Experience.add({ ...props, owner: username });

  // Find next position.
  const documents_x_experiences = await Document_X_Experience.getAll(
    documentId
  );
  const nextPosition = getLastPosition(documents_x_experiences) + 1;

  // Create document-experience relationship.
  const document_x_experience = await Document_X_Experience.add({
    documentId,
    experienceId: experience.id,
    position: nextPosition,
  });

  return { experience, document_x_experience };
}

/**
 * Creates a document_x_experience record (document-experience relationship) in
 * the database.  Experience and document ownership are verified, then the next
 * position is found by getting all document_x_experience records.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document that is having an experience
 *  attach to it.
 * @param {Number} experienceId - ID of the experience to attach to the
 *  document.
 * @returns {Document_X_Experience} A Document_X_Experience instance that
 *  contains the document-experience relationship data.
 */
async function createDocument_x_experience(username, documentId, experienceId) {
  const logPrefix =
    `${fileName}.createDocument_x_experience(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `experienceId = ${experienceId})`;
  logger.verbose(logPrefix);

  // Verify ownership.
  await validateOwnership(
    Experience,
    username,
    { id: experienceId },
    logPrefix
  );
  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  // Find next proper position to place experience in.
  const documents_x_experiences = await Document_X_Experience.getAll(
    documentId
  );
  const nextPosition = getLastPosition(documents_x_experiences) + 1;

  // Add relationship.
  try {
    return await Document_X_Experience.add({
      documentId,
      experienceId,
      position: nextPosition,
    });
  } catch (err) {
    // PostgreSQL error code 23505 is for unique constraint violation.
    if (err.code === '23505') {
      logger.error(`${logPrefix}: Relationship already exists.`);
      throw new BadRequestError(
        'Can not add experience to document, as it already exists.'
      );
    } else {
      throw err;
    }
  }
}

/**
 * Verifies that an experience belongs to the specified user and then updates
 * the experience.
 *
 * @param {String} username - Name of user that wants to update the experience.
 * @param {Number} experienceId - ID of the experience to update.
 * @param {Object} props - Properties of the experience to be updated.  See
 *  route for full list.
 * @returns {Experience} An Experience instance containing the updated info.
 */
async function updateExperience(username, experienceId, props) {
  const logPrefix =
    `${fileName}.updateExperience(` +
    `username = "${username}", ` +
    `experienceId = ${experienceId}), ` +
    `props = ${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  // Verify ownership.
  const experience = await validateOwnership(
    Experience,
    username,
    { id: experienceId },
    logPrefix
  );

  // Update experience.
  return await experience.update(
    transformObjectEmptyStringValuesIntoNulls(props)
  );
}

/**
 * Changes the order of the experiences in a document.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document that is having its
 *  experiences reordered.
 * @param {Number[]} experienceIds - List of experiences IDs with the desired
 *  ordering.
 * @returns {Experience[]} A list of Experience instances, in order of position.
 */
async function updateDocument_x_experiencePositions(
  username,
  documentId,
  experienceIds
) {
  const logPrefix =
    `${fileName}.updateDocument_x_experiencePositions(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `experienceIds = ${JSON.stringify(experienceIds)})`;
  logger.verbose(logPrefix);

  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  // Verify that experienceIds contains all of the experiences in the document.
  const documents_x_experiences = await Document_X_Experience.getAll(
    documentId
  );
  if (
    documents_x_experiences.length !== experienceIds.length ||
    !documents_x_experiences.every((dxe) =>
      experienceIds.includes(dxe.experienceId)
    )
  ) {
    logger.error(
      `${logPrefix}: Provided experience IDs do not exactly ` +
        'match those in document.'
    );
    throw new BadRequestError(
      'All experiences, and only those, need to be included ' +
        'when updating their positions in a document.'
    );
  }

  await Document_X_Experience.updateAllPositions(documentId, experienceIds);

  return await Experience.getAllInDocument(documentId);
}

/**
 * Deletes a document-experience relationship.  Document ownership is first
 * verified.
 *
 * @param {String} username - Name of user that wants to delete the
 *  document-experience relationship.  This should be the owner.
 * @param {Number} documentId - ID of the document to remove the experience
 *  from.
 * @param {Number} experienceId - ID of the experience to be removed.
 */
async function deleteDocument_x_experience(username, documentId, experienceId) {
  const logPrefix =
    `${fileName}.deleteDocument_x_experience(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `experienceId = ${experienceId})`;
  logger.verbose(logPrefix);

  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  await Document_X_Experience.delete(documentId, experienceId);
}

/**
 * Deletes an experience.
 *
 * @param {String} username - Name of user that wants to delete the experience.
 *  This should be the owner.
 * @param {Number} experienceId - ID of the experience to be deleted.
 */
async function deleteExperience(username, experienceId) {
  const logPrefix =
    `${fileName}.deleteExperience(` +
    `username = "${username}", ` +
    `experienceId = ${experienceId})`;
  logger.verbose(logPrefix);

  const experience = await validateOwnership(
    Experience,
    username,
    { id: experienceId },
    logPrefix
  );

  await experience.delete();
}

// ==================================================

module.exports = {
  createExperience,
  createDocument_x_experience,
  updateExperience,
  updateDocument_x_experiencePositions,
  deleteDocument_x_experience,
  deleteExperience,
};
