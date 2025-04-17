'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const Experience = require('../models/experience');
const Document_X_Experience = require('../models/document_x_experience');
const TextSnippet = require('../models/textSnippet');
const Experience_X_Text_Snippet = require('../models/experience_x_text_snippet');
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
 * @returns {{
 *    textSnippet: TextSnippet,
 *    experienceXTextSnippet: Experience_X_Text_Snippet
 *  }}
 *  textSnippet - Text snippet ID, version, owner, parent, type, and content.
 *  experienceXTextSnippet - The document-experience ID that owns the text
 *  snippet, text snippet ID, version of the text snippet, and position of the
 *  text snippet among other text snippets in the experience and document.
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
 * @returns {TextSnippet[]} A list of text snippets belonging to an experience.
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
 * @returns {Experience_X_Text_Snippet} An Experience_X_Text_Snippet instance
 *  that contains the experience-text snippet relationship data.
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
  createExperience,
  updateExperience,
  createDocument_x_experience,
  deleteDocument_x_experience,
  deleteExperience,
  createTextSnippet,
  getTextSnippets,
  createExperience_x_textSnippet,
  deleteExperience_x_textSnippet,
};
