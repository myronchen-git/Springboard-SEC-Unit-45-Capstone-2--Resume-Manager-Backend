'use strict';

const Document = require('../models/document');
const Section = require('../models/section');
const Document_X_Section = require('../models/document_x_section');
const {
  createDocument_x_section,
  updateDocument_x_sectionPositions,
} = require('./sectionService');
const {
  validateOwnership: mockValidateOwnership,
  getLastPosition: mockGetLastPosition,
} = require('../util/serviceHelpers');

const { BadRequestError } = require('../errors/appErrors');

const { documents_x_sections } = require('../_testData');

// ==================================================

jest.mock('../util/serviceHelpers');
jest.mock('../models/document_x_section');
jest.mock('../models/section');

// ==================================================

// --------------------------------------------------
// createDocument_x_section

describe('createDocument_x_section', () => {
  const username = 'user1';
  const documentId = 1;

  beforeEach(() => {
    mockValidateOwnership.mockReset();
    Document_X_Section.getAll.mockReset();
    mockGetLastPosition.mockReset();
    Document_X_Section.add.mockReset();
  });

  test.each([
    [Object.freeze([]), -1],
    [documents_x_sections, 1],
  ])(
    'Adds a Document_X_Section, if document is found and belongs to user, ' +
      'and at the correct next position.  Existing documents_x_sections = %j.',
    async (existingDocuments_x_sections, lastPosition) => {
      // Arrange
      const sectionIdToAdd = 3;

      const mockDocument_x_section = Object.freeze({});
      Document_X_Section.getAll.mockResolvedValue(existingDocuments_x_sections);
      mockGetLastPosition.mockReturnValue(lastPosition);
      Document_X_Section.add.mockResolvedValue(mockDocument_x_section);

      // Act
      const document_x_section = await createDocument_x_section(
        username,
        documentId,
        sectionIdToAdd
      );

      // Assert
      expect(document_x_section).toBe(mockDocument_x_section);

      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );

      expect(Document_X_Section.getAll).toHaveBeenCalledWith(documentId);

      expect(mockGetLastPosition).toHaveBeenCalledWith(
        existingDocuments_x_sections
      );

      expect(Document_X_Section.add).toHaveBeenCalledWith({
        documentId,
        sectionId: sectionIdToAdd,
        position: lastPosition + 1,
      });
    }
  );

  test(
    'Throws a BadRequestError if adding a Document_X_Section results in ' +
      'a duplicate primary key database error.',
    async () => {
      // Arrange
      const sectionIdToAdd = 3;
      const existingDocuments_x_sections = Object.freeze([]);
      const lastPosition = -1;

      const mockDatabaseError = { code: '23505' };

      Document_X_Section.getAll.mockResolvedValue(existingDocuments_x_sections);
      mockGetLastPosition.mockReturnValue(lastPosition);
      Document_X_Section.add.mockRejectedValue(mockDatabaseError);

      // Act
      async function runFunc() {
        await createDocument_x_section(username, documentId, sectionIdToAdd);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(BadRequestError);

      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );

      expect(Document_X_Section.getAll).toHaveBeenCalledWith(documentId);

      expect(mockGetLastPosition).toHaveBeenCalledWith(
        existingDocuments_x_sections
      );

      expect(Document_X_Section.add).toHaveBeenCalledWith({
        documentId,
        sectionId: sectionIdToAdd,
        position: lastPosition + 1,
      });
    }
  );
});

// --------------------------------------------------
// updateDocument_x_sectionPositions

describe('updateDocument_x_sectionPositions', () => {
  const username = 'user1';
  const documentId = 1;

  const existingDocuments_x_sections = Object.freeze([
    Object.freeze({ documentId, sectionId: 1, position: 2 }),
    Object.freeze({ documentId, sectionId: 2, position: 6 }),
  ]);

  beforeEach(() => {
    mockValidateOwnership.mockReset();
    Document_X_Section.getAll.mockReset();
    Document_X_Section.updateAllPositions.mockReset();
    Section.getAllInDocument.mockReset();
  });

  test(
    'Does not throw an Error if given exactly the section IDs ' +
      'in the document.',
    async () => {
      // Arrange
      const sectionIds = Object.freeze([2, 1]);

      const mockArray = Object.freeze([]);
      Document_X_Section.getAll.mockResolvedValue(existingDocuments_x_sections);
      Section.getAllInDocument.mockResolvedValue(mockArray);

      // Act
      const documents_x_sections = await updateDocument_x_sectionPositions(
        username,
        documentId,
        sectionIds
      );

      // Assert
      expect(documents_x_sections).toBe(mockArray);
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );
      expect(Document_X_Section.getAll).toHaveBeenCalledWith(documentId);
      expect(Document_X_Section.updateAllPositions).toHaveBeenCalledWith(
        documentId,
        sectionIds
      );
      expect(Section.getAllInDocument).toHaveBeenCalledWith(documentId);
    }
  );

  test.each([[[1]], [[1, 2, 3]], [[3, 2, 1]], [[5, 8]]])(
    'Throws an Error if section IDs are not exactly the ones and ' +
      'amount in the document.  sectionIds = %j.',
    async (sectionIds) => {
      // Arrange
      const mockArray = Object.freeze([]);
      Document_X_Section.getAll.mockResolvedValue(existingDocuments_x_sections);
      Section.getAllInDocument.mockResolvedValue(mockArray);

      // Act
      async function runFunc() {
        await updateDocument_x_sectionPositions(
          username,
          documentId,
          sectionIds
        );
      }

      // Assert
      await expect(runFunc).rejects.toThrow(BadRequestError);
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );
      expect(Document_X_Section.updateAllPositions).not.toHaveBeenCalled();
      expect(Section.getAllInDocument).not.toHaveBeenCalled();
    }
  );
});
