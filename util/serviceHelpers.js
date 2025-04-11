'use strict';

const Document = require('../models/document');

const { ForbiddenError } = require('../errors/appErrors');

const { pascalToSpaceSeparated } = require('./caseConversions');
const logger = require('../util/logger');

// ==================================================

/**
 * Checks that a document belongs to a specified user.  The document will be
 * retrieved.
 *
 * @param {String} username - Name of the user that wants to access the
 *  document.
 * @param {Number} documentId - ID of the document that is being accessed.
 * @param {String} logPrefix - Log text to put in front of main content of logs.
 * @returns {Document} A Document instance containing all of the document's
 *  data.
 * @throws {ForbiddenError} If the document does not belong to the user.
 */
async function validateDocumentOwner(username, documentId, logPrefix) {
  const document = await Document.get({ id: documentId });

  if (document.owner !== username) {
    logger.error(
      `${logPrefix}: User "${username}" attempted to access document ` +
        `with ID ${documentId}, which belongs to "${document.owner}".`
    );
    throw new ForbiddenError(
      `Can not access document with ID ${documentId}, ` +
        'as it belongs to another user.'
    );
  }

  return document;
}

/**
 * Checks that an item (document, education, etc.) belongs to a specified user.
 * Retrieves an item from the database and verifies the owner.  The item in the
 * database must have an "owner" property.
 *
 * @param {Class} modelClass - The JS class of the item.
 * @param {String} username - Name of the user that wants access.
 * @param {Object} idOrOthers - ID or other relevant identifications of the
 *  relevant item that is being accessed.
 * @param {String} logPrefix - Log text to put in front of any logs.
 * @returns {Object} The relevant model Object, containing the retrieved data.
 * @throws {ForbiddenError} If the item does not belong to the user.
 */
async function validateOwnership(modelClass, username, idOrOthers, logPrefix) {
  const object = await modelClass.get(idOrOthers);

  if (object.owner !== username) {
    logger.error(
      `${logPrefix}: ${modelClass.name} does not belong to user "${username}"; ` +
        `it belongs to "${object.owner}".`
    );
    throw new ForbiddenError(
      `Can not access or interact with another user's ${pascalToSpaceSeparated(
        modelClass.name
      )}.`
    );
  }

  return object;
}

/**
 * Gets the position of the last section, education, experience, etc. of a
 * document, or return -1.  The last position is the one with the highest value.
 * The list of relationships must be in ascending position order.
 *
 * @param {Array} relationships - A list of the document and content
 *  relationships.
 * @returns {Number} Highest value position or -1 if there are no sections,
 *  educations, experiences, etc..
 */
function getLastPosition(relationships) {
  return relationships.at(-1)?.position ?? -1;
}

// ==================================================

module.exports = {
  validateDocumentOwner,
  validateOwnership,
  getLastPosition,
};
