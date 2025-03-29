'use strict';

const jsonschema = require('jsonschema');

const User = require('../models/user');

const { BadRequestError } = require('../errors/appErrors');
const logger = require('../util/logger');

// ==================================================

/**
 * Runs the JSON schema validation.  This should be used in routes.
 *
 * This contains some rewording of error messages given by jsonschema, so that
 * clients see friendlier error messages.
 *
 * @param {Object} schema - JSON schema to validate against.
 * @param {Object} reqBody - The request body.
 * @param {String} logPrefix - Log text to put in front of main content of logs.
 * @throws {BadRequestError} An Error if the request body is not valid.
 */
function runJsonSchemaValidator(schema, reqBody, logPrefix) {
  const validator = jsonschema.validate(reqBody, schema);

  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);

    logger.error(
      `${logPrefix}: JSON schema validation failed.  ${errs.join(', ')}`
    );

    const rewordedErrs = errs.map((err) => {
      const lowerCaseErr = err.toLowerCase();

      if (lowerCaseErr.includes('instance.username'))
        return User.usernameRequirementsMessage;

      if (lowerCaseErr.includes('password does not match pattern'))
        return User.passwordRequirementsMessage;

      const foundMatch = lowerCaseErr.match(
        /(?<=instance.).*(?= does not match pattern)/
      );
      if (foundMatch) return `Invalid ${foundMatch}.`;

      return err;
    });

    throw new BadRequestError(rewordedErrs);
  }
}

// ==================================================

module.exports = { runJsonSchemaValidator };
