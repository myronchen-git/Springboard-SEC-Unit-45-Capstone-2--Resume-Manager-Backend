'use strict';

const Document = require('../models/document');
const { updateDocument, deleteDocument } = require('./documentService');
const {
  validateDocumentOwner: mockValidateDocumentOwner,
} = require('../util/serviceHelpers');

const {
  ForbiddenError,
  NotFoundError,
  ArgumentError,
} = require('../errors/appErrors');

// ==================================================

jest.mock('../util/serviceHelpers');
jest.mock('../models/document');

// ==================================================

// --------------------------------------------------
// updateDocument

describe('updateDocument', () => {
  const username = 'user1';
  const documentId = '1';
  const props = Object.freeze({
    documentName: 'New name',
    isTemplate: false,
    isLocked: true,
  });

  const mockUpdate = jest.fn();

  beforeEach(() => {
    mockValidateDocumentOwner.mockReset();
    mockUpdate.mockReset();
  });

  test('Calls document.update if document belongs to user.', async () => {
    // Arrange
    const document = { owner: username, isMaster: false };

    mockValidateDocumentOwner.mockResolvedValue(document);
    document.update = mockUpdate.mockResolvedValue(document);

    Object.freeze(document);

    // Act
    const updatedDocument = await updateDocument(username, documentId, props);

    // Assert
    expect(updatedDocument).toBe(document);
    expect(mockValidateDocumentOwner).toHaveBeenCalledWith(
      username,
      documentId,
      expect.any(String)
    );
    expect(document.update).toHaveBeenCalledWith(props);
  });

  test.each([[Object.freeze({ documentName: props.documentName })], [props]])(
    'If document is the master resume, calls document.update ' +
      'if documentName is given.',
    async (props) => {
      // Arrange
      const document = { owner: username, isMaster: true };

      mockValidateDocumentOwner.mockResolvedValue(document);
      document.update = mockUpdate.mockResolvedValue(document);

      Object.freeze(document);

      // Act
      const updatedDocument = await updateDocument(username, documentId, props);

      // Assert
      expect(updatedDocument).toBe(document);
      expect(mockValidateDocumentOwner).toHaveBeenCalledWith(
        username,
        documentId,
        expect.any(String)
      );
      expect(document.update).toHaveBeenCalledWith({
        documentName: props.documentName,
      });
    }
  );

  test.each([[{}], [(({ documentName, ...rest }) => rest)(props)]])(
    'Throws an Error if document is the master resume ' +
      'and documentName is not given.',
    async (props) => {
      // Arrange
      const document = { owner: username, isMaster: true };

      mockValidateDocumentOwner.mockResolvedValue(document);
      document.update = mockUpdate.mockResolvedValue(document);

      Object.freeze(document);

      // Act
      async function runFunc() {
        await updateDocument(username, documentId, props);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(ArgumentError);
      expect(mockValidateDocumentOwner).toHaveBeenCalledWith(
        username,
        documentId,
        expect.any(String)
      );
      expect(document.update).not.toHaveBeenCalled();
    }
  );
});

// --------------------------------------------------
// deleteDocument

describe('deleteDocument', () => {
  const username = 'user1';
  const documentId = '1';

  const mockDelete = jest.fn();

  beforeEach(() => {
    mockValidateDocumentOwner.mockReset();
    mockDelete.mockReset();
  });

  test('Calls document.delete if document is found and belongs to user.', async () => {
    // Arrange
    const document = { owner: username, isMaster: false };

    mockValidateDocumentOwner.mockResolvedValue(document);
    document.delete = mockDelete;

    // Act
    await deleteDocument(username, documentId);

    // Assert
    expect(mockValidateDocumentOwner).toHaveBeenCalledWith(
      username,
      documentId,
      expect.any(String)
    );
    expect(document.delete).toHaveBeenCalled();
  });

  test('Throws an Error if the document is the master resume.', async () => {
    // Arrange
    const document = { owner: username, isMaster: true };

    mockValidateDocumentOwner.mockResolvedValue(document);
    document.delete = mockDelete;

    // Act
    async function runFunc() {
      await deleteDocument(username, documentId);
    }

    // Assert
    await expect(runFunc).rejects.toThrow(ForbiddenError);
    expect(mockValidateDocumentOwner).toHaveBeenCalledWith(
      username,
      documentId,
      expect.any(String)
    );
    expect(document.delete).not.toHaveBeenCalled();
  });

  test('Does not throw an Error if document is not found.', async () => {
    // Arrange
    const document = { owner: username, isMaster: false };

    mockValidateDocumentOwner.mockRejectedValue(new NotFoundError());
    document.delete = mockDelete;

    // Act
    await deleteDocument(username, documentId);

    // Assert
    expect(mockValidateDocumentOwner).toHaveBeenCalledWith(
      username,
      documentId,
      expect.any(String)
    );
    expect(document.delete).not.toHaveBeenCalled();
  });

  test('Passes along other Errors from validateDocumentOwner.', async () => {
    // Arrange
    const document = { owner: username, isMaster: false };

    mockValidateDocumentOwner.mockRejectedValue(new Error());
    document.delete = mockDelete;

    // Act
    async function runFunc() {
      await deleteDocument(username, documentId);
    }

    // Assert
    await expect(runFunc).rejects.toThrow();
    expect(mockValidateDocumentOwner).toHaveBeenCalledWith(
      username,
      documentId,
      expect.any(String)
    );
    expect(document.delete).not.toHaveBeenCalled();
  });
});
