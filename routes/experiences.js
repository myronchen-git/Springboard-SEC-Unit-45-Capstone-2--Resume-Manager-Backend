'use strict';

const express = require('express');

const urlParamsSchema = require('../schemas/urlParams.json');
const experienceNewSchema = require('../schemas/experienceNew.json');

const Experience = require('../models/experience');
const { createExperience } = require('../services/experienceService');
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

// ==================================================

module.exports = router;
