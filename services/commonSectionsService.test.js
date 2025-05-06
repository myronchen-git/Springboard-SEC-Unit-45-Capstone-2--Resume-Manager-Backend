'use strict';

const Document = require('../models/document');
const {
  createSectionItem,
  createDocumentXSectionTypeRelationship,
} = require('./commonSectionsService');
const {
  validateOwnership: mockValidateOwnership,
  getLastPosition: mockGetLastPosition,
} = require('../util/serviceHelpers');

const { BadRequestError, ForbiddenError } = require('../errors/appErrors');

// ==================================================

jest.mock('../models/document');
jest.mock('../util/serviceHelpers');

// ==================================================

const username = 'user1';
const documentId = 1;

// Generic class for sections like Education and Experience.
const GenericSectionType = Object.freeze({
  name: 'GenericSectionType',
  add: jest.fn(),
});

// Generic class for document-section relationships like Document_X_Education
// and Document_X_Experience.
const GenericDocumentXSectionType = Object.freeze({
  add: jest.fn(),
  getAll: jest.fn(),
});

// --------------------------------------------------
// createSectionItem

describe('createSectionItem', () => {
  const mockProps = Object.freeze({ school: 'University' });
  const mockDocument = { isMaster: true };
  const mockSectionItem = Object.freeze({ id: 123 });
  const mockDocumentXSectionTypeRelationships = Object.freeze([]);
  const lastPosition = 9;
  const mockDocumentXSectionTypeRelationship = Object.freeze({});

  beforeEach(() => {
    mockValidateOwnership.mockReset();
    GenericSectionType.add.mockClear();
    GenericDocumentXSectionType.getAll.mockClear();
    mockGetLastPosition.mockReset();
    GenericDocumentXSectionType.add.mockClear();
  });

  test(
    'Creates a new section item and positions it in a document, ' +
      'if document belongs to user.',
    async () => {
      // Arrange
      mockValidateOwnership.mockResolvedValue(mockDocument);
      GenericSectionType.add.mockResolvedValue(mockSectionItem);
      GenericDocumentXSectionType.getAll.mockResolvedValue(
        mockDocumentXSectionTypeRelationships
      );
      mockGetLastPosition.mockReturnValue(lastPosition);
      GenericDocumentXSectionType.add.mockResolvedValue(
        mockDocumentXSectionTypeRelationship
      );

      // Act
      const { genericSectionType, document_x_genericSectionType } =
        await createSectionItem(
          GenericSectionType,
          GenericDocumentXSectionType,
          username,
          documentId,
          mockProps
        );

      // Assert
      expect(genericSectionType).toEqual(mockSectionItem);
      expect(document_x_genericSectionType).toEqual(
        mockDocumentXSectionTypeRelationship
      );

      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );

      expect(GenericSectionType.add).toHaveBeenCalledWith({
        ...mockProps,
        owner: username,
      });

      expect(GenericDocumentXSectionType.getAll).toHaveBeenCalledWith(
        documentId
      );

      expect(mockGetLastPosition).toHaveBeenCalledWith(
        mockDocumentXSectionTypeRelationships
      );

      expect(GenericDocumentXSectionType.add).toHaveBeenCalledWith({
        documentId,
        genericSectionTypeId: mockSectionItem.id,
        position: lastPosition + 1,
      });
    }
  );

  test('The position of the new section item is after the last (highest) one.', async () => {
    // Arrange
    mockValidateOwnership.mockResolvedValue(mockDocument);
    GenericSectionType.add.mockResolvedValue(mockSectionItem);
    GenericDocumentXSectionType.getAll.mockResolvedValue(
      mockDocumentXSectionTypeRelationships
    );
    mockGetLastPosition.mockReturnValue(lastPosition);
    GenericDocumentXSectionType.add.mockResolvedValue(
      mockDocumentXSectionTypeRelationship
    );

    // Act
    await createSectionItem(
      GenericSectionType,
      GenericDocumentXSectionType,
      username,
      documentId,
      mockProps
    );

    // Assert
    expect(GenericDocumentXSectionType.add).toHaveBeenCalledWith(
      expect.objectContaining({ position: lastPosition + 1 })
    );
  });

  test(
    'The position of the new section item is 0 if there are no existing ' +
      'section items in the document.',
    async () => {
      // Arrange
      const lastPosition = -1;

      mockValidateOwnership.mockResolvedValue(mockDocument);
      GenericSectionType.add.mockResolvedValue(mockSectionItem);
      GenericDocumentXSectionType.getAll.mockResolvedValue(
        mockDocumentXSectionTypeRelationships
      );
      mockGetLastPosition.mockReturnValue(lastPosition);
      GenericDocumentXSectionType.add.mockResolvedValue(
        mockDocumentXSectionTypeRelationship
      );

      // Act
      await createSectionItem(
        GenericSectionType,
        GenericDocumentXSectionType,
        username,
        documentId,
        mockProps
      );

      // Assert
      expect(GenericDocumentXSectionType.add).toHaveBeenCalledWith(
        expect.objectContaining({ position: lastPosition + 1 })
      );
    }
  );

  test('Throws an Error if document is not the master resume.', async () => {
    // Arrange
    const mockDocument = { isMaster: false };

    mockValidateOwnership.mockResolvedValue(mockDocument);

    // Act
    async function runFunc() {
      await createSectionItem(
        GenericSectionType,
        GenericDocumentXSectionType,
        username,
        documentId,
        mockProps
      );
    }

    // Assert
    await expect(runFunc).rejects.toThrow(ForbiddenError);
    expect(GenericSectionType.add).not.toHaveBeenCalled();
    expect(GenericDocumentXSectionType.getAll).not.toHaveBeenCalled();
    expect(mockGetLastPosition).not.toHaveBeenCalled();
    expect(GenericDocumentXSectionType.add).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------
// createDocumentXSectionTypeRelationship

describe('createDocumentXSectionTypeRelationship', () => {
  const sectionItemId = 1;
  const documentXSectionTypeRelationshipsMock = Object.freeze([]);
  const lastPosition = 9;
  const documentXSectionTypeRelationshipMock = Object.freeze({});

  beforeEach(() => {
    mockValidateOwnership.mockReset();
    GenericDocumentXSectionType.getAll.mockClear();
    mockGetLastPosition.mockReset();
    GenericDocumentXSectionType.add.mockClear();
  });

  test(
    'Creates a document-(section item) relationship' +
      ' at the correct next position.',
    async () => {
      // Arrange
      GenericDocumentXSectionType.getAll.mockResolvedValue(
        documentXSectionTypeRelationshipsMock
      );
      mockGetLastPosition.mockReturnValue(lastPosition);
      GenericDocumentXSectionType.add.mockResolvedValue(
        documentXSectionTypeRelationshipMock
      );

      // Act
      const result = await createDocumentXSectionTypeRelationship(
        GenericSectionType,
        GenericDocumentXSectionType,
        username,
        documentId,
        sectionItemId
      );

      // Assert
      expect(result).toBe(documentXSectionTypeRelationshipMock);

      expect(mockValidateOwnership).toHaveBeenCalledTimes(2);
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        GenericSectionType,
        username,
        { id: sectionItemId },
        expect.any(String)
      );
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );

      expect(GenericDocumentXSectionType.getAll).toHaveBeenCalledWith(
        documentId
      );

      expect(mockGetLastPosition).toHaveBeenCalledWith(
        documentXSectionTypeRelationshipsMock
      );

      expect(GenericDocumentXSectionType.add).toHaveBeenCalledWith({
        documentId,
        genericSectionTypeId: sectionItemId,
        position: lastPosition + 1,
      });
    }
  );

  test(
    'Throws an Error if relationship already exists ' +
      '(PostgreSQL error code 23505).',
    async () => {
      // Arrange
      const duplicateError = new Error('database error');
      duplicateError.code = '23505';

      GenericDocumentXSectionType.getAll.mockResolvedValue(
        documentXSectionTypeRelationshipsMock
      );
      mockGetLastPosition.mockReturnValue(lastPosition);
      GenericDocumentXSectionType.add.mockRejectedValue(duplicateError);

      // Act / Assert
      await expect(
        createDocumentXSectionTypeRelationship(
          GenericSectionType,
          GenericDocumentXSectionType,
          username,
          documentId,
          sectionItemId
        )
      ).rejects.toThrow(BadRequestError);

      // Assert
      expect(mockValidateOwnership).toHaveBeenCalledTimes(2);
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        GenericSectionType,
        username,
        { id: sectionItemId },
        expect.any(String)
      );
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );

      expect(GenericDocumentXSectionType.getAll).toHaveBeenCalledWith(
        documentId
      );

      expect(mockGetLastPosition).toHaveBeenCalledWith(
        documentXSectionTypeRelationshipsMock
      );

      expect(GenericDocumentXSectionType.add).toHaveBeenCalledWith({
        documentId,
        genericSectionTypeId: sectionItemId,
        position: lastPosition + 1,
      });
    }
  );

  test("Rethrows unknown errors from relationship class' add().", async () => {
    // Arrange
    const unknownError = new Error('database error');
    unknownError.code = '99999';

    GenericDocumentXSectionType.getAll.mockResolvedValue(
      documentXSectionTypeRelationshipsMock
    );
    mockGetLastPosition.mockReturnValue(lastPosition);
    GenericDocumentXSectionType.add.mockRejectedValue(unknownError);

    // Act / Assert
    await expect(
      createDocumentXSectionTypeRelationship(
        GenericSectionType,
        GenericDocumentXSectionType,
        username,
        documentId,
        sectionItemId
      )
    ).rejects.not.toThrow(BadRequestError);

    // Assert
    expect(mockValidateOwnership).toHaveBeenCalledTimes(2);
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      GenericSectionType,
      username,
      { id: sectionItemId },
      expect.any(String)
    );
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );

    expect(GenericDocumentXSectionType.getAll).toHaveBeenCalledWith(documentId);

    expect(mockGetLastPosition).toHaveBeenCalledWith(
      documentXSectionTypeRelationshipsMock
    );

    expect(GenericDocumentXSectionType.add).toHaveBeenCalledWith({
      documentId,
      genericSectionTypeId: sectionItemId,
      position: lastPosition + 1,
    });
  });
});
