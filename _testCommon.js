'use strict';

const Section = require('./models/section');
const User = require('./models/user');

// ==================================================

const urlPrefix = '/api/v1';

const urlRegisterUser = `${urlPrefix}/auth/register`;

const getDocumentsGeneralUrl = (username) =>
  `${urlPrefix}/users/${username}/documents`;
const getDocumentsSpecificUrl = (username, documentId) =>
  `${urlPrefix}/users/${username}/documents/${documentId}`;
const getEducationsGeneralUrl = (username, documentId) =>
  `${urlPrefix}/users/${username}/documents/${documentId}/educations`;
const getEducationsSpecificUrl = (username, documentId, educationId) =>
  `${urlPrefix}/users/${username}/documents/${documentId}/educations/${educationId}`;
const getAllEducationsUrl = (username) =>
  `${urlPrefix}/users/${username}/educations`;
// --------------------------------------------------

async function commonBeforeAll(db) {
  return await db.query({
    queryConfig: {
      text:
        `
  TRUNCATE TABLE ${User.tableName}, ${Section.tableName} ` +
        'RESTART IDENTITY CASCADE;',
    },
  });
}

async function commonAfterAll(db) {
  // Currently uses the same SQL statement as commonBeforeAll.  In the future,
  // write out the db.query call if the SQL changes.
  return await commonBeforeAll(db).then(() => db.shutdown());
}

async function clearTable(db, tableName) {
  return await db.query({
    queryConfig: {
      text: `
  TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`,
    },
  });
}

// ==================================================

module.exports = {
  urlRegisterUser,
  getDocumentsGeneralUrl,
  getDocumentsSpecificUrl,
  getEducationsGeneralUrl,
  getEducationsSpecificUrl,
  getAllEducationsUrl,
  commonBeforeAll,
  commonAfterAll,
  clearTable,
};
