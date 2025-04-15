'use strict';

const express = require('express');

const urlParamsSchema = require('../schemas/urlParams.json');
const documentNewSchema = require('../schemas/documentNew.json');
const documentUpdateSchema = require('../schemas/documentUpdate.json');

const Document = require('../models/document');
const {
  getDocument,
  updateDocument,
  deleteDocument,
} = require('../services/documentService');
const { ensureLoggedIn } = require('../middleware/auth');
const { runJsonSchemaValidator } = require('../util/validators');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

/**
 * POST /users/:username/documents
 * { documentName, isTemplate } => { document }
 *
 * Authorization required: login
 *
 * @param {String} documentName - Name of the document.
 * @param {Boolean} isTemplate - Whether this new document should be a template.
 * @returns {Object} document - Returns all info of the document.
 */
router.post('/', ensureLoggedIn, async (req, res, next) => {
  const userPayload = res.locals.user;

  const logPrefix =
    'POST /users/:username/documents (' +
    `user: ${JSON.stringify(userPayload)}, ` +
    `request body: ${JSON.stringify(req.body)})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    runJsonSchemaValidator(documentNewSchema, req.body, logPrefix);

    const document = await Document.add({
      ...req.body,
      owner: userPayload.username,
      isMaster: false,
    });

    return res.status(201).json({ document });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /users/:username/documents
 * {} => { documents }
 *
 * Authorization required: login
 *
 * @returns {Object} documents - Returns a list of documents containing all info
 *  of each document.
 */
router.get('/', ensureLoggedIn, async (req, res, next) => {
  const userPayload = res.locals.user;

  const logPrefix =
    'GET /users/:username/documents (' +
    `user: ${JSON.stringify(userPayload)})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    const documents = await Document.getAll(userPayload.username);

    return res.json({ documents });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /users/:username/documents/:documentId
 * {} => { document }
 *
 * Authorization required: login
 *
 * Gets a document and all section content in it.
 *
 * @returns {{document}} Document properties, user contact info, sections, and
 *  content in sections.
 */
router.get('/:documentId', ensureLoggedIn, async (req, res, next) => {
  const userPayload = res.locals.user;

  const { username, documentId } = req.params;

  const logPrefix =
    `GET /users/${username}/documents/${documentId} ` +
    `(user: ${JSON.stringify(userPayload)})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    runJsonSchemaValidator(urlParamsSchema, { documentId }, logPrefix);

    const document = await getDocument(userPayload.username, documentId);

    return res.json({ document });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /users/:username/documents/:documentId
 * { documentName, isTemplate, isLocked } => { document }
 *
 * Authorization required: login
 *
 * Updates a document's properties.  If document is master resume, then only
 * documentName can be updated.
 *
 * @param {String} [documentName] - New name of the document.
 * @param {Boolean} [isTemplate] - Whether this document should be a template.
 * @param {Boolean} [isLocked] - Whether this document should be locked.
 * @returns {Object} document - Returns all info of the updated document.
 */
router.patch('/:documentId', ensureLoggedIn, async (req, res, next) => {
  const userPayload = res.locals.user;
  const { documentId } = req.params;

  const logPrefix =
    'PATCH /users/:username/documents/:documentId (' +
    `user: ${JSON.stringify(userPayload)}, ` +
    `request body: ${JSON.stringify(req.body)})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    runJsonSchemaValidator(documentUpdateSchema, req.body, logPrefix);

    const document = await updateDocument(
      userPayload.username,
      documentId,
      req.body
    );

    return res.json({ document });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /users/:username/documents/:docId
 * {} => {}
 *
 * Authorization required: login
 */
router.delete('/:docId', ensureLoggedIn, async (req, res, next) => {
  const userPayload = res.locals.user;

  const logPrefix =
    'DELETE /users/:username/documents/:docId (' +
    `user: ${JSON.stringify(userPayload)})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    await deleteDocument(userPayload.username, req.params.docId);

    return res.sendStatus(200);
  } catch (err) {
    return next(err);
  }
});

// ==================================================

module.exports = router;
