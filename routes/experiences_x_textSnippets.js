'use strict';

const express = require('express');

const urlParamsSchema = require('../schemas/urlParams.json');
const textSnippetNewSchema = require('../schemas/textSnippetNew.json');
const textSnippetVersionSchema = require('../schemas/textSnippetVersion.json');

const {
  createTextSnippet,
  getTextSnippets,
  createExperience_x_textSnippet,
  deleteExperience_x_textSnippet,
} = require('../services/experienceService');
const { ensureLoggedIn } = require('../middleware/auth');
const { runJsonSchemaValidator } = require('../util/validators');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

/**
 * POST /:username/documents/:documentId/experiences/:experienceId/text-snippets
 * { type, content } => { textSnippet, experienceXTextSnippet }
 *
 * Authorization required: login
 *
 * Creates a text snippet entry and a relationship between the entry and the
 * experience and document.
 *
 * Note that, currently, text snippets can only be added to experiences in the
 * master resume. This can be changed in the future.
 *
 * @param {String} type - The type of content, such as bullet point or
 *  description.
 * @param {String} content - Content of the text snippet.
 * @returns {{
 *    textSnippet: TextSnippet,
 *    experienceXTextSnippet: Experience_X_Text_Snippet
 *  }}
 *  textSnippet - Text snippet ID, version, owner, parent, type, and content.
 *  experienceXTextSnippet - The document-experience ID that owns the text
 *  snippet, text snippet ID, version of the text snippet, and position of the
 *  text snippet among other text snippets in the experience and document.
 */
router.post(
  '/:username/documents/:documentId/experiences/:experienceId/text-snippets',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId, experienceId } = req.params;

    const logPrefix =
      `POST /users/${username}/documents/${documentId}` +
      `/experiences/${experienceId}/text-snippets ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, experienceId },
        logPrefix
      );
      runJsonSchemaValidator(textSnippetNewSchema, req.body, logPrefix);

      const { textSnippet, experienceXTextSnippet } = await createTextSnippet(
        userPayload.username,
        documentId,
        experienceId,
        req.body
      );

      return res.status(201).json({ textSnippet, experienceXTextSnippet });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /:username/documents/:documentId/experiences/:experienceId
 * /text-snippets/:textSnippetId
 * { textSnippetVersion } => { experienceXTextSnippet }
 *
 * Authorization required: login
 *
 * Creates an experience-text snippet relationship.  The position of the text
 * snippet in the experience will be after the last position of any existing
 * text snippets.
 *
 * Document ID is needed, because the display of an experience and its contents
 * is specific to a document.
 *
 * @param {String} textSnippetVersion - Version part of the text snippet.
 * @returns {{experienceXTextSnippet}} The experience_x_textSnippet Object,
 *  which contains the ID of the document_x_experience, text snippet ID and
 *  version, and position of the text snippet within the experience.
 */
router.post(
  '/:username/documents/:documentId/experiences/:experienceId' +
    '/text-snippets/:textSnippetId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId, experienceId, textSnippetId } = req.params;
    const { textSnippetVersion } = req.body;

    const logPrefix =
      `POST /users/${username}/documents/${documentId}` +
      `/experiences/${experienceId}/text-snippets/${textSnippetId} ` +
      `(user: ${JSON.stringify(userPayload)}, ` +
      `request body: ${JSON.stringify(req.body)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, experienceId, textSnippetId },
        logPrefix
      );
      runJsonSchemaValidator(
        textSnippetVersionSchema,
        textSnippetVersion,
        logPrefix
      );

      const experienceXTextSnippet = await createExperience_x_textSnippet(
        username,
        documentId,
        experienceId,
        textSnippetId,
        textSnippetVersion
      );

      return res.json({ experienceXTextSnippet });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /:username/experiences/:experienceId/text-snippets
 * {} => { textSnippets }
 *
 * Authorization required: login
 *
 * Gets all the text snippets for an experience from a user.
 *
 * @returns {{ textSnippets }} A list of text snippets that an experience has.
 */
router.get(
  '/:username/experiences/:experienceId/text-snippets',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, experienceId } = req.params;

    const logPrefix =
      `GET /users/${username}/experiences/${experienceId}/text-snippets ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { experienceId }, logPrefix);

      const textSnippets = await getTextSnippets(
        userPayload.username,
        experienceId
      );

      return res.json({ textSnippets });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /users/:username/documents/:documentId/experiences/:experienceId
 * /text-snippets/:textSnippetId
 * {} => {}
 *
 * Authorization required: login
 *
 * Deletes an experience-text snippet relationship.
 */
router.delete(
  '/:username/documents/:documentId/experiences/:experienceId' +
    '/text-snippets/:textSnippetId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId, experienceId, textSnippetId } = req.params;

    const logPrefix =
      `DELETE /users/${username}/documents/${documentId}` +
      `/experiences/${experienceId}/text-snippets/${textSnippetId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, experienceId, textSnippetId },
        logPrefix
      );

      await deleteExperience_x_textSnippet(
        userPayload.username,
        documentId,
        experienceId,
        textSnippetId
      );

      return res.sendStatus(200);
    } catch (err) {
      return next(err);
    }
  }
);

// ==================================================

module.exports = router;
