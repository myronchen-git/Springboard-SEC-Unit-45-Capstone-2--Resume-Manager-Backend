'use strict';

const express = require('express');

const userRegisterSchema = require('../schemas/userRegister.json');
const userSigninSchema = require('../schemas/userSignin.json');

const User = require('../models/user');
const { createUser } = require('../services/userService');
const { createJWT } = require('../util/tokens');
const { runJsonSchemaValidator } = require('../util/validators');

const logger = require('../util/logger');

// ==================================================

const router = new express.Router();

// --------------------------------------------------

/**
 * POST /auth/register
 * { username, password } => { authToken }
 *
 * Authorization required: none
 *
 * @param {String} username - Username for the new user.
 * @param {String} password - Password for the new user.
 * @returns {String} authToken - A JWT that can be used to authenticate further
 *  requests.
 */
router.post('/register', async (req, res, next) => {
  const logPrefix = `POST /auth/register (request body: ${JSON.stringify({
    ...req.body,
    password: '(password)',
  })})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    runJsonSchemaValidator(userRegisterSchema, req.body, logPrefix);

    const authToken = await createUser(req.body);

    return res.status(201).json({ authToken });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /auth/signin
 * { username, password } => { authToken }
 *
 * Authorization required: none
 *
 * @param {String} username - Username of the existing user.
 * @param {String} password - Password of the existing user.
 * @returns {String} authToken - A JWT that can be used to authenticate further
 *  requests.
 */
router.post('/signin', async (req, res, next) => {
  const logPrefix = `POST /auth/signin (request body: ${JSON.stringify({
    ...req.body,
    password: '(password)',
  })})`;
  logger.info(logPrefix + ' BEGIN');

  try {
    runJsonSchemaValidator(userSigninSchema, req.body, logPrefix);

    const user = await User.signin(req.body);
    const authToken = createJWT(user);

    return res.json({ authToken });
  } catch (err) {
    return next(err);
  }
});

// ==================================================

module.exports = router;
