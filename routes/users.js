'use strict';

const express = require('express');

const contactInfoSchema = require('../schemas/contactInfo.json');
const userUpdateSchema = require('../schemas/userUpdate.json');

const ContactInfo = require('../models/contactInfo');
const { ensureLoggedIn } = require('../middleware/auth');
const { runJsonSchemaValidator } = require('../util/validators');
const {
  updateUser,
  createUpdateContactInfo,
} = require('../services/userService');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

/**
 * PATCH /users/:username
 * { oldPassword, newPassword } => { user }
 *
 * Authorization required: login
 *
 * Updates user account settings, such as password.
 *
 * @param {String} [oldPassword] - User's old password.
 * @param {String} [newPassword] - User's new password.
 * @returns {{user: User}} user - Contains all user account info, except
 *  password.
 **/
router.patch('/:username', ensureLoggedIn, async (req, res, next) => {
  const userPayload = res.locals.user;

  const requestBodyForLog = { ...req.body };
  requestBodyForLog.oldPassword &&= '(password)';
  requestBodyForLog.newPassword &&= '(password)';

  const logPrefix =
    'PATCH /users/:username (' +
    `user: ${JSON.stringify(userPayload)}, ` +
    `request body: ${JSON.stringify(requestBodyForLog)})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    runJsonSchemaValidator(userUpdateSchema, req.body, logPrefix);

    const user = await updateUser(userPayload.username, req.body);

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /users/:username/contact-info
 * { fullName, location, email, phone, linkedin, github } => { contactInfo }
 *
 * Authorization required: login
 *
 * Creates a new contact info entry or updates an existing one.  Full name is
 * required when creating a new contact info entry in the database.
 *
 * @param {String} [fullName] - Full name of the user.
 * @param {String} [location] - Any kind of location description for the user.
 *  This can be full address, nearest city, etc..
 * @param {String} [email] - Email of the user.
 * @param {String} [phone] - Phone number of the user.
 * @param {String} [linkedin] - LinkedIn URL address for the profile of the
 *  user.
 * @param {String} [github] - GitHub URL address for the user's GitHub profile.
 * @returns {Object} contactInfo - Returns all contact information of the user.
 */
router.put(
  '/:username/contact-info',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;

    const logPrefix =
      'PUT /users/:username/contact-info (' +
      `user: ${JSON.stringify(userPayload)}, ` +
      `request body: ${JSON.stringify(req.body)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      runJsonSchemaValidator(contactInfoSchema, req.body, logPrefix);

      const [statusCode, contactInfo] = await createUpdateContactInfo(
        userPayload.username,
        req.body
      );

      return res.status(statusCode).json({ contactInfo });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /users/:username/contact-info
 * {} => { contactInfo }
 *
 * Authorization required: login
 *
 * @returns {Object} contactInfo - Returns all contact information of the user.
 */
router.get(
  '/:username/contact-info',
  ensureLoggedIn,
  async (req, res, next) => {
    const userPayload = res.locals.user;

    const logPrefix =
      'GET /users/:username/contact-info (' +
      `user: ${JSON.stringify(userPayload)})`;
    logger.info(logPrefix + ' BEGIN');

    try {
      const contactInfo = await ContactInfo.get({
        username: userPayload.username,
      });

      return res.json({ contactInfo });
    } catch (err) {
      return next(err);
    }
  }
);

// ==================================================

module.exports = router;
