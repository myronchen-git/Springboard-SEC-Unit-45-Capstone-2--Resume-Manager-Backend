'use strict';

const express = require('express');

const urlParamsSchema = require('../schemas/urlParams.json');
const textSnippetVersionSchema = require('../schemas/textSnippetVersion.json');

const { deleteTextSnippet } = require('../services/textSnippetService');
const { ensureLoggedIn } = require('../middleware/auth');
const { runJsonSchemaValidator } = require('../util/validators');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

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
