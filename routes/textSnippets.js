'use strict';

const express = require('express');

const urlParamsSchema = require('../schemas/urlParams.json');
const textSnippetVersionSchema = require('../schemas/textSnippetVersion.json');
const textSnippetUpdateSchema = require('../schemas/textSnippetUpdate.json');

const {
  updateTextSnippet,
  deleteTextSnippet,
} = require('../services/textSnippetService');
const { ensureLoggedIn } = require('../middleware/auth');
const { runJsonSchemaValidator } = require('../util/validators');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

/**
 * PATCH /users/:username/text-snippets/:textSnippetId
 * { textSnippetVersion, type, content } => { textSnippet }
 *
 * Authorization required: login
 *
 * Updates a text snippet.  This creates a new text snippet with a different
 * version, but references the old one.
 *
 * @param {String} textSnippetVersion - Version part of the text snippet.
 * @param {String} [type] - Type of content.
 * @param {String} [content] - Content of the text snippet.
 * @returns {{ textSnippet: TextSnippet }} The text snippet Object containing
 *  the updated info.
 */
router.patch(
  '/:username/text-snippets/:textSnippetId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, textSnippetId } = req.params;
    const { textSnippetVersion, ...restOfRequestBody } = req.body;

    const logPrefix =
      `PATCH /users/${username}/text-snippets/${textSnippetId} ` +
      `(user: ${JSON.stringify(userPayload)}, ` +
      `request body: ${JSON.stringify(req.body)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { textSnippetId }, logPrefix);
      runJsonSchemaValidator(
        textSnippetVersionSchema,
        textSnippetVersion,
        logPrefix
      );
      runJsonSchemaValidator(
        textSnippetUpdateSchema,
        restOfRequestBody,
        logPrefix
      );

      const textSnippet = await updateTextSnippet(
        username,
        textSnippetId,
        textSnippetVersion,
        restOfRequestBody
      );

      return res.json({ textSnippet });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /users/:username/text-snippets/:textSnippetId
 * { textSnippetVersion } => {}
 *
 * Authorization required: login
 *
 * Deletes a text snippet.
 *
 * @param {String} textSnippetVersion - Version part of the text snippet.
 */
router.delete(
  '/:username/text-snippets/:textSnippetId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, textSnippetId } = req.params;
    const { textSnippetVersion } = req.body;

    const logPrefix =
      `DELETE /users/${username}/text-snippets/${textSnippetId} ` +
      `(user: ${JSON.stringify(userPayload)}, ` +
      `request body: ${JSON.stringify(req.body)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { textSnippetId }, logPrefix);
      runJsonSchemaValidator(
        textSnippetVersionSchema,
        textSnippetVersion,
        logPrefix
      );

      await deleteTextSnippet(username, textSnippetId, textSnippetVersion);

      return res.sendStatus(200);
    } catch (err) {
      return next(err);
    }
  }
);

// ==================================================

module.exports = router;
