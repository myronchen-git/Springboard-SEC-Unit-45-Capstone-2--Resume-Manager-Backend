'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const TextSnippet = require('../models/textSnippet');
const { validateOwnership } = require('../util/serviceHelpers');

const logger = require('../util/logger');

// ==================================================

/**
 * Verifies ownership of a text snippet and deletes it from the database.
 *
 * @param {String} username - Name of user that wants to delete the text
 *  snippet. This should be the owner.
 * @param {Number} textSnippetId - ID part of the text snippet to delete.
 * @param {String} textSnippetVersion - Version part of the text snippet to
 *  delete.
 */
async function deleteTextSnippet(username, textSnippetId, textSnippetVersion) {
  const logPrefix =
    `${fileName}.deleteTextSnippet(` +
    `username = "${username}", ` +
    `textSnippetId = ${textSnippetId}, ` +
    `textSnippetVersion = "${textSnippetVersion}")`;
  logger.verbose(logPrefix);

  const textSnippet = await validateOwnership(
    TextSnippet,
    username,
    { id: textSnippetId, version: textSnippetVersion },
    logPrefix
  );

  await textSnippet.delete();
}

// ==================================================

module.exports = { deleteTextSnippet };
