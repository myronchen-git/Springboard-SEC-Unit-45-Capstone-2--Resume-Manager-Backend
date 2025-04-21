'use strict';

const express = require('express');

const urlParamsSchema = require('../schemas/urlParams.json');
const educationNewSchema = require('../schemas/educationNew.json');
const educationUpdateSchema = require('../schemas/educationUpdate.json');
const documentRelationshipPositionsSchema = require('../schemas/documentRelationshipPositions.json');

const Education = require('../models/education');
const {
  createEducation,
  createDocument_x_education,
  updateEducation,
  updateDocument_x_educationPositions,
  deleteDocument_x_education,
  deleteEducation,
} = require('../services/educationService');
const { ensureLoggedIn } = require('../middleware/auth');
const { runJsonSchemaValidator } = require('../util/validators');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

/**
 * POST /users/:username/documents/:documentId/educations
 * {
 *  school,
 *  location,
 *  startDate,
 *  endDate,
 *  degree,
 *  gpa,
 *  awardsAndHonors,
 *  activities
 * } => { education, document_x_education }
 *
 * Authorization required: login
 *
 * Creates an education entry and a relationship between the entry and the
 * document.  The position of the new entry will be after the last position of
 * any existing educations.
 *
 * Note that, currently, educations can only be added to the master resume.
 * This can be changed in the future.
 *
 * @param {String} school - School or education center name.
 * @param {String} location - Location of school.
 * @param {String} startDate - The start date of joining the school.
 * @param {String} endDate - The end date of leaving the school.
 * @param {String} degree - The degree name that was or will be given from the
 *  school.
 * @param {String} [gpa] - The grade point average throughout the attendance.
 * @param {String} [awardsAndHonors] - Any awards or honors given by the school.
 * @param {String} [activities] - Any activities done in relation to the school.
 * @returns {{
 *    education: Education,
 *    document_x_education: Document_X_Education
 *  }}
 *  education - The education ID and all of the given info.
 *  document_x_education - The document ID that owns the education, the
 *  education ID, and the position of the education among other educations in
 *  the document.
 */
router.post(
  '/:username/documents/:documentId/educations',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId } = req.params;

    const logPrefix =
      `POST /users/${username}/documents/${documentId}/educations ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { documentId }, logPrefix);
      runJsonSchemaValidator(educationNewSchema, req.body, logPrefix);

      const { education, document_x_education } = await createEducation(
        userPayload.username,
        documentId,
        req.body
      );

      return res.status(201).json({ education, document_x_education });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /users/:username/documents/:documentId/educations/:educationId
 * {} => { document_x_education }
 *
 * Authorization required: login
 *
 * Creates a document-education relationship.  The position of the education in
 * the document will be after the last position of any existing educations.
 *
 * @returns {{document_x_education}} The document ID, education ID, and position
 *  of education within the document.
 */
router.post(
  '/:username/documents/:documentId/educations/:educationId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId, educationId } = req.params;

    const logPrefix =
      `POST /users/${username}/documents/${documentId}/educations/${educationId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, educationId },
        logPrefix
      );

      const document_x_education = await createDocument_x_education(
        userPayload.username,
        documentId,
        educationId
      );

      return res.status(201).json({ document_x_education });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /users/:username/educations
 * {} => { educations }
 *
 * Authorization required: login
 *
 * Gets all educations for a user.
 *
 * @returns {{ educations }} A list of educations that a user has.
 */
router.get('/:username/educations', ensureLoggedIn, async (req, res, next) => {
  const userPayload = res.locals.user;
  const { username } = req.params;

  const logPrefix =
    `GET /users/${username}/educations ` +
    `(user: ${JSON.stringify(userPayload)})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    const educations = await Education.getAll(userPayload.username);

    return res.json({ educations });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /users/:username/documents/:documentId/educations/:educationId
 * {
 *  school,
 *  location,
 *  startDate,
 *  endDate,
 *  degree,
 *  gpa,
 *  awardsAndHonors,
 *  activities
 * } => { education }
 *
 * Authorization required: login
 *
 * Updates an education.  All input data are optional, but at least one is
 * needed, else an error is thrown.
 *
 * @param {String} [school] - School or education center name.
 * @param {String} [location] - Location of school.
 * @param {String} [startDate] - The start date of joining the school.
 * @param {String} [endDate] - The end date of leaving the school.
 * @param {String} [degree] - The degree name that was or will be given from the
 *  school.
 * @param {String} [gpa] - The grade point average throughout the attendance.
 * @param {String} [awardsAndHonors] - Any awards or honors given by the school.
 * @param {String} [activities] - Any activities done in relation to the school.
 * @returns {{ education }} The education ID and info like school, location, and
 *  dates.
 */
router.patch(
  '/:username/documents/:documentId/educations/:educationId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId, educationId } = req.params;

    const logPrefix =
      `PATCH /users/${username}/documents/${documentId}/educations/${educationId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, educationId },
        logPrefix
      );
      runJsonSchemaValidator(educationUpdateSchema, req.body, logPrefix);

      const education = await updateEducation(
        userPayload.username,
        documentId,
        educationId,
        req.body
      );

      return res.json({ education });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PUT /users/:username/documents/:documentId/educations
 * [ educationId, educationId, ... ] => { educations }
 *
 * Authorization required: login
 *
 * Updates the positions of all educations in a document.  All educations need
 * to be included.
 *
 * @param {String} educationId - ID of a education.
 * @returns {Education[]} educations - A list of Education Objects in order of
 *  position in the document, each containing education info.
 */
router.put(
  '/:username/documents/:documentId/educations',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, documentId } = req.params;

    const logPrefix =
      `PUT /users/${username}/documents/${documentId}/educations ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { documentId }, logPrefix);
      runJsonSchemaValidator(
        documentRelationshipPositionsSchema,
        req.body,
        logPrefix
      );

      const educations = await updateDocument_x_educationPositions(
        userPayload.username,
        documentId,
        req.body
      );

      return res.json({ educations });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /users/:username/documents/:documentId/educations/:educationId
 * {} => {}
 *
 * Authorization required: login
 *
 * Deletes a document-education relationship.
 */
router.delete(
  '/:username/documents/:documentId/educations/:educationId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;

    const { username, documentId, educationId } = req.params;

    const logPrefix =
      `DELETE /users/${username}/documents/${documentId}/educations/${educationId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(
        urlParamsSchema,
        { documentId, educationId },
        logPrefix
      );

      await deleteDocument_x_education(
        userPayload.username,
        documentId,
        educationId
      );

      return res.sendStatus(200);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /users/:username/educations/:educationId
 * {} => {}
 *
 * Authorization required: login
 *
 * Deletes an education.
 */
router.delete(
  '/:username/educations/:educationId',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;
    const { username, educationId } = req.params;

    const logPrefix =
      `DELETE /users/${username}/educations/${educationId} ` +
      `(user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(urlParamsSchema, { educationId }, logPrefix);

      await deleteEducation(userPayload.username, educationId);

      return res.sendStatus(200);
    } catch (err) {
      return next(err);
    }
  }
);

// ==================================================

module.exports = router;
