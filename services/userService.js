'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const User = require('../models/user');
const ContactInfo = require('../models/contactInfo');
const { createJWT } = require('../util/tokens');

const { BadRequestError, NotFoundError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Creates a new user and does related account setup.  Related setup involves
 * creating a master resume.
 *
 * @param {Object} props - Contains the data to create a new user account.  See
 *  route for full list.
 * @param {String} props.username - Username for the new user.
 * @returns {String} An authentication token for the user to use.
 */
async function createUser(props) {
  const logPrefix = `${fileName}.createUser(${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  const newUser = await User.register(props);
  const authToken = createJWT(newUser);

  // This does not need to be awaited, because the master resume does not need
  // to be used immediately.  The main concern is to create a user account.
  Document.add({
    documentName: 'Master',
    owner: props.username,
    isMaster: true,
    isTemplate: false,
  });

  return authToken;
}

/**
 * For updating password, verifies the old password if a new password is
 * supplied.  Makes a database call to store the new settings.
 *
 * @param {String} username - Name of user that wants to update his/her account
 *  settings.
 * @param {Object} props - Properties of the user account to be updated.  See
 *  route for full list.
 * @returns {User} A User instance that contains the updated info.
 */
async function updateUser(username, props) {
  const logPrefix =
    `${fileName}.updateUser(` +
    `username = ${username}, props = ${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  // Setting up data for updating.
  const dataToUpdate = { ...props };
  delete dataToUpdate.oldPassword;

  // For changing password.
  if (props.newPassword) {
    // Verify old password.
    await User.signin({ username, password: props.oldPassword });

    // Setting up data for updating password.
    delete dataToUpdate.newPassword;
    dataToUpdate.password = props.newPassword;
  }

  return await User.update(username, dataToUpdate);
}

/**
 * Holds the logic for creating a new contact info entry or updating an existing
 * one.  The given information is checked for full name if creating a new
 * contact info entry in the database.
 *
 * @param {String} username - Name of user that is creating a new or updating an
 *  existing contact info.
 * @param {Object} props - Contains the contact information.  See route for full
 *  list.
 * @returns {[Number, ContactInfo]} The status code to return in the API
 *  response and a ContactInfo instance containing the updated information.
 * @throws {BadRequestError} If creating a new contact info entry without a full
 *  name.
 */
async function createUpdateContactInfo(username, props) {
  const logPrefix =
    `${fileName}.createUpdateContactInfo(` +
    `username = ${username}, props = ${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  try {
    // Retrieve contact info if it exists.
    const contactInfo = await ContactInfo.get({ username });

    // Update existing contact info.
    await contactInfo.update(props);

    return [200, contactInfo];
  } catch (err) {
    // If contact info does not exist.
    if (err instanceof NotFoundError) {
      // Require full name if creating a new contact info entry in the database.
      if (!props.fullName) {
        logger.error(
          `${logPrefix}: Missing full name for new contact info entry.`
        );
        throw new BadRequestError(
          'Full name is required when saving contact info for the first time.'
        );
      }

      // Create a new contact info entry.
      const contactInfo = await ContactInfo.add({ username, ...props });

      return [201, contactInfo];
    } else {
      throw err;
    }
  }
}

// ==================================================

module.exports = { createUser, updateUser, createUpdateContactInfo };
