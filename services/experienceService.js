'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const Experience = require('../models/experience');
const Document_X_Experience = require('../models/document_x_experience');
const {
  validateOwnership,
  getLastPosition,
} = require('../util/serviceHelpers');

const { ForbiddenError } = require('../errors/appErrors');

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
    documentId,
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

// ==================================================

module.exports = {
  createExperience,
};
