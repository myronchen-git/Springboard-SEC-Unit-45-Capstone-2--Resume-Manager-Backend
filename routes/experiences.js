'use strict';

const express = require('express');

const urlParamsSchema = require('../schemas/urlParams.json');
const experienceNewSchema = require('../schemas/experienceNew.json');
const experienceUpdateSchema = require('../schemas/experienceUpdate.json');

const Experience = require('../models/experience');
const {
  createExperience,
  createDocument_x_experience,
  updateExperience,
  deleteDocument_x_experience,
  deleteExperience,
} = require('../services/experienceService');
const { ensureLoggedIn } = require('../middleware/auth');
const { runJsonSchemaValidator } = require('../util/validators');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

/**
 * POST /users/:username/documents/:documentId/experiences
 * {
 *  title,
 *  organization,
 *  location,
 *  startDate,
 *  endDate,
 * } => { experience, document_x_experience }
 *
 * Authorization required: login
 *
 * Creates an experience entry and a relationship between the entry and the
 * document.  The position of the new entry will be after the last position of
 * any existing experiences.
 *
 * Note that, currently, experiences can only be added to the master resume.
 * This can be changed in the future.
 *
 * @param {String} title - Job title or equivalent.
 * @param {String} organization - Name of the company or other type of
 *  organization.
 * @param {String} location - Location of the organization.
 * @param {String} startDate - The start date of joining the organization.
 * @param {String} [endDate] - The end date of leaving the organization.
 * @returns {{
 *    experience: Experience,
 *    document_x_experience: Document_X_Experience
 *  }}
 *  experience - The experience ID and all of the given info.
 *  document_x_experience - The ID of the document_x_experience, the document ID
 *  that owns the experience, the experience ID, and the position of the
 *  experience among other experiences in the document.
 */
router.post(
  '/:username/documents/:documentId/experiences',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId } = req.params;

    const logPrefix =
      `POST /users/${username}/documents/${documentId}/experiences ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { documentId }, logPrefix);
      runJsonSchemaValidator(experienceNewSchema, req.body, logPrefix);

      const { experience, document_x_experience } = await createExperience(
        userPayload.username,
        documentId,
        req.body
      );

      return res.status(201).json({ experience, document_x_experience });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /users/:username/documents/:documentId/experiences/:experienceId
 * {} => { document_x_experience }
 *
 * Authorization required: login
 *
 * Creates a document-experience relationship.  The position of the experience
 * in the document will be after the last position of any existing experiences.
 *
 * @returns {{document_x_experience}} The ID of the document_x_experience,
 *  document ID, experience ID, and position of experience within the document.
 */
router.post(
  '/:username/documents/:documentId/experiences/:experienceId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId, experienceId } = req.params;

    const logPrefix =
      `POST /users/${username}/documents/${documentId}` +
      `/experiences/${experienceId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, experienceId },
        logPrefix
      );

      const document_x_experience = await createDocument_x_experience(
        userPayload.username,
        documentId,
        experienceId
      );

      return res.status(201).json({ document_x_experience });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /users/:username/experiences
 * {} => { experiences }
 *
 * Authorization required: login
 *
 * Gets all experiences for a user.
 *
 * @returns {{ experiences }} A list of experiences that a user has.
 */
router.get('/:username/experiences', ensureLoggedIn, async (req, res, next) => {
  const userPayload = res.locals.user;
  const { username } = req.params;

  const logPrefix =
    `GET /users/${username}/experiences ` +
    `(user: ${JSON.stringify(userPayload)})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    const experiences = await Experience.getAll(userPayload.username);

    return res.json({ experiences });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /users/:username/experiences/:experienceId
 * {
 *  title,
 *  organization,
 *  location,
 *  startDate,
 *  endDate,
 * } => { experience }
 *
 * Authorization required: login
 *
 * Updates an experience.  All input data are optional, but at least one is
 * needed, else an error is thrown.
 *
 * @param {String} [title] - Job title or equivalent.
 * @param {String} [organization] - Name of the company or other type of
 *  organization.
 * @param {String} [location] - Location of the organization.
 * @param {String} [startDate] - Start date of joining the organization.
 * @param {String} [endDate] - End date of leaving the organization.
 */
router.patch(
  '/:username/experiences/:experienceId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, experienceId } = req.params;

    const logPrefix =
      `PATCH /users/${username}/experiences/${experienceId} ` +
      `(user: ${JSON.stringify(userPayload)}, ` +
      `request body: ${JSON.stringify(req.body)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { experienceId }, logPrefix);
      runJsonSchemaValidator(experienceUpdateSchema, req.body, logPrefix);

      const experience = await updateExperience(
        userPayload.username,
        experienceId,
        req.body
      );

      return res.json({ experience });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /users/:username/documents/:documentId/experiences/:experienceId
 * {} => {}
 *
 * Authorization required: login
 *
 * Deletes a document-experience relationship.
 */
router.delete(
  '/:username/documents/:documentId/experiences/:experienceId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;

    const { username, documentId, experienceId } = req.params;

    const logPrefix =
      `DELETE /users/${username}/documents/${documentId}` +
      `/experiences/${experienceId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, experienceId },
        logPrefix
      );

      await deleteDocument_x_experience(
        userPayload.username,
        documentId,
        experienceId
      );

      return res.sendStatus(200);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /users/:username/experiences/:experienceId
 * {} => {}
 *
 * Authorization required: login
 *
 * Deletes an experience.
 */
router.delete(
  '/:username/experiences/:experienceId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, experienceId } = req.params;

    const logPrefix =
      `DELETE /users/${username}/experiences/${experienceId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { experienceId }, logPrefix);

      await deleteExperience(userPayload.username, experienceId);

      return res.sendStatus(200);
    } catch (err) {
      return next(err);
    }
  }
);

// ==================================================

module.exports = router;
