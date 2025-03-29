'use strict';

const express = require('express');

const document_x_sectionNewSchema = require('../schemas/document_x_sectionNew.json');
const documentRelationshipPositionsSchema = require('../schemas/documentRelationshipPositions.json');
const urlParamsSchema = require('../schemas/urlParams.json');

const Section = require('../models/section');
const {
  createDocument_x_section,
  getSections,
  updateDocument_x_sectionPositions,
  deleteDocument_x_section,
} = require('../services/sectionService');
const { ensureLoggedIn } = require('../middleware/auth');
const { runJsonSchemaValidator } = require('../util/validators');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

/**
 * GET /sections
 * {} => { sections }
 *
 * Authorization required: none
 *
 * @returns {Object} sections - Returns a list of sections that can be used in
 *  documents.
 */
router.get('/sections', async (req, res, next) => {
  const logPrefix = 'GET /sections';
  logger.info(logPrefix + ' BEGIN');

  try {
    const sections = await Section.getAll();
    return res.json({ sections });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /users/:username/documents/:docId/sections/:sectionId
 * {} => { document_x_section }
 *
 * Authorization required: login
 *
 * Creates document-section relationship.
 *
 * @returns {Object} document_x_section - The document ID, section ID, and
 *  position of section within document.
 */
router.post(
  '/users/:username/documents/:docId/sections/:sectionId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;

    const logPrefix =
      'POST /users/:username/documents/:docId/sections/:sectionId (' +
      `user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    const { docId, sectionId } = req.params;

    try {
      runJsonSchemaValidator(
        document_x_sectionNewSchema,
        { docId, sectionId },
        logPrefix
      );

      const document_x_section = await createDocument_x_section(
        userPayload.username,
        docId,
        sectionId
      );

      return res.status(201).json({ document_x_section });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /users/:username/documents/:documentId/sections
 * {} => { sections }
 *
 * Authorization required: login
 *
 * Gets all sections in a document.  The sections' order is related to their
 * positions.
 *
 * @returns {Object} sections - A list of Objects containing section data in
 *  order of position.
 */
router.get(
  '/users/:username/documents/:documentId/sections',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;

    const { username, documentId } = req.params;

    const logPrefix =
      `GET /users/${username}/documents/${documentId}/sections (` +
      `user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { documentId }, logPrefix);

      const sections = await getSections(userPayload.username, documentId);

      return res.json({ sections });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PUT /users/:username/documents/:documentId/sections
 * [ sectionId, sectionId, ... ] => { sections }
 *
 * Authorization required: login
 *
 * Updates the positions of all sections in a document.  All sections need to be
 * included.
 *
 * @returns {Object} sections - A list of Objects containing section data in
 *  order of position.
 */
router.put(
  '/users/:username/documents/:documentId/sections',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;

    const { username, documentId } = req.params;

    const logPrefix =
      `PUT /users/${username}/documents/${documentId}/sections ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { documentId }, logPrefix);
      runJsonSchemaValidator(
        documentRelationshipPositionsSchema,
        req.body,
        logPrefix
      );

      const sections = await updateDocument_x_sectionPositions(
        userPayload.username,
        documentId,
        req.body
      );

      return res.json({ sections });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /users/:username/documents/:documentId/sections/:sectionId
 * {} => {}
 *
 * Authorization required: login
 *
 * Deletes a document-section relationship.
 */
router.delete(
  '/users/:username/documents/:documentId/sections/:sectionId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;

    const { username, documentId, sectionId } = req.params;

    const logPrefix =
      `DELETE /users/${username}/documents/${documentId}/sections/${sectionId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, sectionId },
        logPrefix
      );

      await deleteDocument_x_section(
        userPayload.username,
        documentId,
        sectionId
      );

      return res.sendStatus(200);
    } catch (err) {
      return next(err);
    }
  }
);

// ==================================================

module.exports = router;
