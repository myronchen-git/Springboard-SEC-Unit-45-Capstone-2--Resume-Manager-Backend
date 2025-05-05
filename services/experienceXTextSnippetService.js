'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const Experience = require('../models/experience');
const Document_X_Experience = require('../models/document_x_experience');
const TextSnippet = require('../models/textSnippet');
const Experience_X_Text_Snippet = require('../models/experience_x_textSnippet');
const {
  validateOwnership,
  getLastPosition,
} = require('../util/serviceHelpers');

const { BadRequestError, ForbiddenError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Creates a text snippet and experience-text snippet relationship entry in the
 * database.  The new text snippet will be positioned after the last, or highest
 * value position, text snippet in the document.
 *
 * Note that, currently, text snippets can only be added to experiences in the
 * master resume. This can be changed in the future.
 *
 * Document and experience ownerships are first verified.
 *
 * @param {String} username - Name of user that wants to add a text snippet to
 *  the experience and document.
 * @param {Number} documentId - ID of the document that the associated
 *  experience is in.
 * @param {Number} experienceId - ID of the experience that is being attached
 *  with a text snippet.
 * @param {Object} props - Properties of the text snippet to add.
 * @throws {ForbiddenError} If the document is not the master resume.
 * @returns {Promise<{
 *    textSnippet: TextSnippet,
 *    experienceXTextSnippet: Experience_X_Text_Snippet
 *  }>}
 *  textSnippet - Text snippet ID, version, owner, parent, type, and content.
 *  experienceXTextSnippet - The experience-(text snippet) relationship that
 *  contains the document-experience ID, text snippet ID, version of the text
 *  snippet, and position of the text snippet among other text snippets in the
 *  experience and document.
 */
async function createTextSnippet(username, documentId, experienceId, props) {
  const logPrefix =
    `${fileName}.createTextSnippet(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `experienceId = ${experienceId}, ` +
    `props = ${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  // Verify document ownership.
  const document = await validateOwnership(
    Document,
    username,
    { id: documentId },
    logPrefix
  );

  // Checking if document is master.
  if (!document.isMaster) {
    logger.error(
      `${logPrefix}: User attempted to add a text snippet ` +
        'not to the master resume.'
    );
    throw new ForbiddenError(
      'Text snippet can only be added to the master resume.'
    );
  }

  // Verify experience ownership.
  await validateOwnership(
    Experience,
    username,
    { id: experienceId },
    logPrefix
  );

  // Create text snippet.
  const textSnippet = await TextSnippet.add({ ...props, owner: username });

  // Creating relationship to master ...

  // Find the document-experience relationship ID.
  const documentXExperienceId = (
    await Document_X_Experience.get({ documentId, experienceId })
  ).id;

  // Find next position.
  const experiencesXTextSnippets = await Experience_X_Text_Snippet.getAll(
    documentXExperienceId
  );
  const nextPosition = getLastPosition(experiencesXTextSnippets) + 1;

  // Create experience-text snippet relationship.
  const experienceXTextSnippet = await Experience_X_Text_Snippet.add({
    documentXExperienceId,
    textSnippetId: textSnippet.id,
    textSnippetVersion: textSnippet.version,
    position: nextPosition,
  });

  return { textSnippet, experienceXTextSnippet };
}

/**
 * Gets all text snippets for a specified experience from a user.
 *
 * Experience ownership is first verified.
 *
 * @param {String} username - Name of the user to get text snippets for.
 * @param {Number} experienceId - ID of the experience to get text snippets for.
 * @returns {Promise<TextSnippet[]>} A list of text snippets belonging to an
 *  experience.
 */
async function getTextSnippets(username, experienceId) {
  const logPrefix =
    `${fileName}.getTextSnippets(` +
    `username = "${username}", ` +
    `experienceId = ${experienceId})`;
  logger.verbose(logPrefix);

  await validateOwnership(
    Experience,
    username,
    { id: experienceId },
    logPrefix
  );

  return await TextSnippet.getAllForExperience(username, experienceId);
}

/**
 * Verifies document, experience, and text snippet ownership and creates an
 * experience-text snippet relationship in the database.  The new text snippet
 * will be positioned after the last, or highest value position, text snippet in
 * the document.
 *
 * Note that, text snippets can only be attached to experiences not in the
 * master resume, because currently, only text snippets can be added to the
 * master, which results in a relationship already being created in the master.
 * It would also not make sense to have the master resume pull info from other
 * documents when the purpose of the master resume is to have info be pulled out
 * of it.
 *
 * @param {String} username - Name of the user that wants to attach a text
 *  snippet.
 * @param {Number} documentId - ID of the document that the associated
 *  experience is in.
 * @param {Number} experienceId - ID of the experience to a text snippet to.
 * @param {Number} textSnippetId - ID part of the text snippet to attach.
 * @param {String} textSnippetVersion - Version part of the text snippet to
 *  attach.
 * @returns {Promise<Experience_X_Text_Snippet>} An Experience_X_Text_Snippet
 *  instance that contains the experience-text snippet relationship data.
 */
async function createExperience_x_textSnippet(
  username,
  documentId,
  experienceId,
  textSnippetId,
  textSnippetVersion
) {
  const logPrefix =
    `${fileName}.createExperience_x_textSnippet(` +
    `username = "${username}", ` +
    `documentId = "${documentId}", ` +
    `experienceId = "${experienceId}", ` +
    `textSnippetId = "${textSnippetId}", ` +
    `textSnippetVersion = ${textSnippetVersion})`;
  logger.verbose(logPrefix);

  // Verify ownership.
  await validateOwnership(Document, username, { id: documentId }, logPrefix);
  await validateOwnership(
    Experience,
    username,
    { id: experienceId },
    logPrefix
  );
  await validateOwnership(
    TextSnippet,
    username,
    { id: textSnippetId, version: textSnippetVersion },
    logPrefix
  );

  // Find the document-experience relationship ID.
  const documentXExperienceId = (
    await Document_X_Experience.get({ documentId, experienceId })
  ).id;

  // Find next position.
  const experiencesXTextSnippets = await Experience_X_Text_Snippet.getAll(
    documentXExperienceId
  );
  const nextPosition = getLastPosition(experiencesXTextSnippets) + 1;

  // Create experience-text snippet relationship.
  return await Experience_X_Text_Snippet.add({
    documentXExperienceId,
    textSnippetId,
    textSnippetVersion,
    position: nextPosition,
  });
}

/**
 * Verifies text snippet ownership and updates it.  Also updates all
 * experiences_x_textSnippets (experience-text snippet relationships) to replace
 * the old text snippet with the new one.
 *
 * @param {String} username - Name of the user that is doing the update.
 * @param {Number} textSnippetId - ID part of the text snippet to update.
 * @param {String} textSnippetVersion - Version part of the text snippet to
 *  update.
 * @param {object} props - Properties of the text snippet to be updated.  See
 *  route for full list.
 * @returns {Promise<TextSnippet>} A TextSnippet instance containing the updated
 *  info.
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

  const updatedTextSnippet = await textSnippet.update(props);

  // Ensure that updatedTextSnippet is a new instance.
  await Experience_X_Text_Snippet.replaceTextSnippet(
    textSnippetId,
    textSnippet.version,
    updatedTextSnippet.version
  );

  return updatedTextSnippet;
}

/**
 * Changes the order of the text snippets in an experience in a document.  The
 * text snippet versions are not needed, because there is only be one text
 * snippet for a particular text snippet ID in an experience in a specific
 * document.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document that the experience belongs
 *  to.
 * @param {Number} experienceId - ID of the experience that is having its text
 *  snippets reordered.
 * @param {Number[]} textSnippetIds - List of text snippet IDs with the desired
 *  ordering.
 * @returns {Promise<TextSnippet[]>} A list of TextSnippet instances, in order
 *  of position within experience and document.
 */
async function updateExperienceXTextSnippetsPositions(
  username,
  documentId,
  experienceId,
  textSnippetIds
) {
  const logPrefix =
    `${fileName}.updateExperience_x_textSnippetsPositions(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `experienceId = ${experienceId}, ` +
    `textSnippetIds = ${JSON.stringify(textSnippetIds)})`;
  logger.verbose(logPrefix);

  // Experience ID does not need to be validated, because only experiences from
  // a user can only be added to that user's documents.  There would be no
  // documents_x_experiences entries if the experience ID does not belong to the
  // user.
  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  const documentXExperienceId = (
    await Document_X_Experience.get({
      documentId,
      experienceId,
    })
  ).id;

  // Verify that textSnippetIds contains all of the text snippets in the
  // experience in the document.
  const experiencesXTextSnippets = await Experience_X_Text_Snippet.getAll(
    documentXExperienceId
  );
  if (
    experiencesXTextSnippets.length !== textSnippetIds.length ||
    !experiencesXTextSnippets.every((ext) =>
      textSnippetIds.includes(ext.textSnippetId)
    )
  ) {
    logger.error(
      `${logPrefix}: Provided text snippet IDs do not exactly ` +
        'match those in document.'
    );
    throw new BadRequestError(
      'All text snippets, and only those, need to be included ' +
        'when updating their positions in an experience in a document.'
    );
  }

  await Experience_X_Text_Snippet.updateAllPositions(
    documentXExperienceId,
    textSnippetIds
  );

  return await TextSnippet.getAllForExperienceInDocument(
    username,
    documentId,
    experienceId
  );
}

/**
 * Deletes an experience-text snippet relationship.  Document ownership is first
 * verified.
 *
 * @param {String} username - Name of user that wants to delete the
 *  experience-text snippet relationship.  This should be the owner.
 * @param {Number} documentId - ID of the document to remove the experience-text
 *  snippet relationship from.
 * @param {Number} experienceId - ID of the experience to remove the
 *  experience-text snippet relationship from.
 * @param {Number} textSnippetId - ID of the text snippet to remove.
 */
async function deleteExperience_x_textSnippet(
  username,
  documentId,
  experienceId,
  textSnippetId
) {
  const logPrefix =
    `${fileName}.deleteExperience_x_textSnippet(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `textSnippetId = ${textSnippetId}, ` +
    `experienceId = ${experienceId})`;
  logger.verbose(logPrefix);

  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  const documentXExperienceId = (
    await Document_X_Experience.get({ documentId, experienceId })
  ).id;

  await Experience_X_Text_Snippet.delete(documentXExperienceId, textSnippetId);
}

// ==================================================

module.exports = {
  createTextSnippet,
  getTextSnippets,
  createExperience_x_textSnippet,
  updateTextSnippet,
  updateExperienceXTextSnippetsPositions,
  deleteExperience_x_textSnippet,
};
