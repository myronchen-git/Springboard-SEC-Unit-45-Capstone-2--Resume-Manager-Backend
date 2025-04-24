'use strict';

const Document = require('../models/document');
const { updateDocument, deleteDocument } = require('./documentService');
const {
  validateOwnership: mockValidateOwnership,
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
    mockValidateOwnership.mockReset();
    mockUpdate.mockReset();
  });

  test.each([[{}], [props]])(
    'Updates document properties for non-master document.',
    async (props) => {
      // Arrange
      const document = { owner: username, isMaster: false };

      mockValidateOwnership.mockResolvedValue(document);
      document.update = mockUpdate.mockResolvedValue(document);

      Object.freeze(document);

      // Act
      const updatedDocument = await updateDocument(username, documentId, props);

      // Assert
      expect(updatedDocument).toBe(document);
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );
      expect(document.update).toHaveBeenCalledWith(props);
    }
  );

  test(
    'If document is the master resume, updates document ' +
      'if only documentName is given.',
    async () => {
      // Arrange
      const document = { owner: username, isMaster: true };
      const updatedProps = Object.freeze({ documentName: props.documentName });

      mockValidateOwnership.mockResolvedValue(document);
      document.update = mockUpdate.mockResolvedValue(document);

      Object.freeze(document);

      // Act
      const updatedDocument = await updateDocument(
        username,
        documentId,
        updatedProps
      );

      // Assert
      expect(updatedDocument).toBe(document);
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
        expect.any(String)
      );
      expect(document.update).toHaveBeenCalledWith({
        documentName: updatedProps.documentName,
      });
    }
  );

  test.each([
    [
      'documentName is not given.',
      (({ documentName, ...rest }) => rest)(props),
    ],
    ['properties other than documentName are also given.', [props]],
  ])(
    'Throws an Error if document is the master resume and %s',
    async (testTitle, props) => {
      // Arrange
      const document = { owner: username, isMaster: true };

      mockValidateOwnership.mockResolvedValue(document);
      document.update = mockUpdate.mockResolvedValue(document);

      Object.freeze(document);

      // Act
      async function runFunc() {
        await updateDocument(username, documentId, props);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(ArgumentError);
      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        { id: documentId },
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
    mockValidateOwnership.mockReset();
    mockDelete.mockReset();
  });

  test('Calls document.delete if document is found and belongs to user.', async () => {
    // Arrange
    const document = { owner: username, isMaster: false };

    mockValidateOwnership.mockResolvedValue(document);
    document.delete = mockDelete;

    // Act
    await deleteDocument(username, documentId);

    // Assert
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );
    expect(document.delete).toHaveBeenCalled();
  });

  test('Throws an Error if the document is the master resume.', async () => {
    // Arrange
    const document = { owner: username, isMaster: true };

    mockValidateOwnership.mockResolvedValue(document);
    document.delete = mockDelete;

    // Act
    async function runFunc() {
      await deleteDocument(username, documentId);
    }

    // Assert
    await expect(runFunc).rejects.toThrow(ForbiddenError);
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );
    expect(document.delete).not.toHaveBeenCalled();
  });

  test('Does not throw an Error if document is not found.', async () => {
    // Arrange
    const document = { owner: username, isMaster: false };

    mockValidateOwnership.mockRejectedValue(new NotFoundError());
    document.delete = mockDelete;

    // Act
    await deleteDocument(username, documentId);

    // Assert
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );
    expect(document.delete).not.toHaveBeenCalled();
  });

  test('Passes along other Errors from validateOwnership.', async () => {
    // Arrange
    const document = { owner: username, isMaster: false };

    mockValidateOwnership.mockRejectedValue(new Error());
    document.delete = mockDelete;

    // Act
    async function runFunc() {
      await deleteDocument(username, documentId);
    }

    // Assert
    await expect(runFunc).rejects.toThrow();
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );
    expect(document.delete).not.toHaveBeenCalled();
  });
});
