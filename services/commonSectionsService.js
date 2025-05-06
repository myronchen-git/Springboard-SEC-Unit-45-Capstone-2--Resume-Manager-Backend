'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const {
  validateOwnership,
  getLastPosition,
} = require('../util/serviceHelpers');
const { pascalToSpaceSeparated } = require('../util/caseConversions');

const { BadRequestError, ForbiddenError } = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Creates a section item and document-(section item) relationship entry in the
 * database.  The new section item will be positioned after the last, or highest
 * value position, section item in the document.
 *
 * Note that, currently, section items can only be added to the master resume.
 * This can be changed in the future.
 *
 * Document ownership is first verified.
 *
 * @param {String} username - Name of user that wants to add a section item
 *  (education, experience, etc.) to the document.
 * @param {Number} documentId - ID of the document that is being attached with
 *  the section item.
 * @param {Object} props - Properties of the section item to add.
 * @returns {Promise<{
 *    sectionTypeNameInCamelCase: SectionTypeClass,
 *    document_x_sectionType: DocumentXSectionTypeClass
 *  }>}
 *  An Object containing a specific section type instance that contains the
 *  saved data and a document and specific section type relationship instance
 *  that contains the document-(section item) relationship data.
 * @throws {ForbiddenError} If the document is not the master resume.
 */
async function createSectionItem(
  classRef,
  documentXClassRef,
  username,
  documentId,
  props
) {
  const logPrefix =
    `${fileName}.createSectionItem(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `props = ${JSON.stringify(props)})`;
  logger.verbose(logPrefix);

  const className = classRef.name;
  const classNameCamelCase = className[0].toLowerCase() + className.slice(1);

  // Verify document ownership and if document is master.
  const document = await validateOwnership(
    Document,
    username,
    { id: documentId },
    logPrefix
  );

  if (!document.isMaster) {
    logger.error(
      `${logPrefix}: User attempted to add a/an ${classNameCamelCase} ` +
        'not to the master resume.'
    );
    throw new ForbiddenError(
      `${className}s can only be added to the master resume.`
    );
  }

  // Create specific section item.
  const sectionItem = await classRef.add({ ...props, owner: username });

  // Find next position.
  const documentXSectionTypeRelationships = await documentXClassRef.getAll(
    documentId
  );
  const nextPosition = getLastPosition(documentXSectionTypeRelationships) + 1;

  // Create document-(section item) relationship.
  const documentXSectionTypeRelationship = await documentXClassRef.add({
    documentId,
    [classNameCamelCase + 'Id']: sectionItem.id,
    position: nextPosition,
  });

  return {
    [classNameCamelCase]: sectionItem,
    ['document_x_' + classNameCamelCase]: documentXSectionTypeRelationship,
  };
}

/**
 * Creates a document-(section item) relationship entry in the database. Section
 * item and document ownership are verified, then the next position is found by
 * getting all document-(section item) relationship records.
 *
 * @param {String} username - Name of user that wants to interact with the
 *  document.  This should be the owner.
 * @param {Number} documentId - ID of the document that is having a section item
 *  attach to it.
 * @param {Number} sectionItemId - ID of the section item to attach to the
 *  document.
 * @returns {Promise<DocumentXSectionTypeClass>} A document and specific section
 *  type relationship instance that contains the relationship data.
 * @throws {BadRequestError} If relationship already exists.
 */
async function createDocumentXSectionTypeRelationship(
  classRef,
  documentXClassRef,
  username,
  documentId,
  sectionItemId
) {
  const logPrefix =
    `${fileName}.createDocumentXSectionTypeRelationship(` +
    `username = "${username}", ` +
    `documentId = ${documentId}, ` +
    `sectionItemId = ${sectionItemId})`;
  logger.verbose(logPrefix);

  const className = classRef.name;
  const classNameLowerCaseSpaced = pascalToSpaceSeparated(className);
  const classNameCamelCase = className[0].toLowerCase() + className.slice(1);

  // Verify ownership.
  await validateOwnership(classRef, username, { id: sectionItemId }, logPrefix);
  await validateOwnership(Document, username, { id: documentId }, logPrefix);

  // Find next proper position to place section item in.
  const documentXSectionTypeRelationships = await documentXClassRef.getAll(
    documentId
  );
  const nextPosition = getLastPosition(documentXSectionTypeRelationships) + 1;

  // Add relationship.
  try {
    return await documentXClassRef.add({
      documentId,
      [classNameCamelCase + 'Id']: sectionItemId,
      position: nextPosition,
    });
  } catch (err) {
    // PostgreSQL error code 23505 is for unique constraint violation.
    if (err.code === '23505') {
      logger.error(`${logPrefix}: Relationship already exists.`);
      throw new BadRequestError(
        `Can not add ${classNameLowerCaseSpaced} to document, ` +
          'as it already exists.'
      );
    } else {
      throw err;
    }
  }
}

// ==================================================

module.exports = {
  createSectionItem,
  createDocumentXSectionTypeRelationship,
};
