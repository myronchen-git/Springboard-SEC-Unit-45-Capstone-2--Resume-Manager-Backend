'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const TextSnippet = require('../models/textSnippet');
const { validateOwnership } = require('../util/serviceHelpers');

const logger = require('../util/logger');

// ==================================================

/**
 * Verifies text snippet ownership and updates it.
 *
 * @param {String} username - Name of the user that is doing the update.
 * @param {Number} textSnippetId - ID part of the text snippet to update.
 * @param {String} textSnippetVersion - Version part of the text snippet to
 *  update.
 * @param {object} props - Properties of the text snippet to be updated.  See
 *  route for full list.
 * @returns {TextSnippet} A TextSnippet instance containing the updated info.
 */
async function updateTextSnippet(
  username,
  textSnippetId,
  textSnippetVersion,
  props
) {
  const logPrefix =
    `${fileName}.updateTextSnippet(` +
    `username = "${username}", ` +
    `textSnippetId = ${textSnippetId}, ` +
    `textSnippetVersion = "${textSnippetVersion}", ` +
    `props = ${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  const textSnippet = await validateOwnership(
    TextSnippet,
    username,
    { id: textSnippetId, version: textSnippetVersion },
    logPrefix
  );

  return await textSnippet.update(props);
}

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

module.exports = { updateTextSnippet, deleteTextSnippet };
