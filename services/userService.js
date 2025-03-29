'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const User = require('../models/user');
const { createJWT } = require('../util/tokens');

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

// ==================================================

module.exports = { createUser };
