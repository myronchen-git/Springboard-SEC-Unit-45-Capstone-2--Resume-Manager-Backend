'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js');

const Document = require('../models/document');
const {
  validateOwnership,
  getLastPosition,
} = require('../util/serviceHelpers');

const { ForbiddenError } = require('../errors/appErrors');

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

// ==================================================

module.exports = {
  createSectionItem,
};
