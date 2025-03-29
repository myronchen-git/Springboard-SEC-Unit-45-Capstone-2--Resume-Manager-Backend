'use strict';

const Document = require('../models/document');
const {
  validateDocumentOwner,
  validateOwnership,
  getLastPosition,
} = require('./serviceHelpers');

const { ForbiddenError } = require('../errors/appErrors');

// ==================================================

jest.mock('../models/document');

// ==================================================

describe('validateDocumentOwner', () => {
  const username = 'user1';
  const documentId = '1';

  const mockGet = jest.fn();

  beforeEach(() => {
    mockGet.mockReset();
  });

  test('Returns the specified document if it belongs to the specified user.', async () => {
    // Arrange
    const document = Object.freeze({ owner: username });

    Document.get = mockGet.mockResolvedValue(document);

    // Act
    const returnedDocument = await validateDocumentOwner(
      username,
      documentId,
      ''
    );

    // Assert
    expect(returnedDocument).toEqual(document);
    expect(Document.get).toHaveBeenCalledWith({ id: documentId });
  });

  test('Throws an Error if document does not belong to user.', async () => {
    // Arrange
    const document = { owner: 'otherUser' };

    Document.get = mockGet.mockResolvedValue(document);

    // Act
    async function runFunc() {
      await validateDocumentOwner(username, documentId, '');
    }

    // Assert
    await expect(runFunc).rejects.toThrow(ForbiddenError);
    expect(Document.get).toHaveBeenCalledWith({ id: documentId });
  });
});

// --------------------------------------------------

describe('validateOwnership', () => {
  const username = 'user1';
  const itemId = '1';

  const mockClass = Object.freeze({ get: jest.fn(), name: 'mockClass' });

  beforeEach(() => {
    mockClass.get.mockReset();
  });

  test('Returns retrieved object if it belongs to the specified user.', async () => {
    // Arrange
    const mockRetrievedObject = Object.freeze({ owner: username });

    mockClass.get.mockResolvedValue(mockRetrievedObject);

    // Act
    const returnedObject = await validateOwnership(
      mockClass,
      username,
      itemId,
      ''
    );

    // Assert
    expect(returnedObject).toEqual(mockRetrievedObject);
    expect(mockClass.get).toHaveBeenCalledWith({ id: itemId });
  });

  test('Throws an Error if retrieved object does not belong to user.', async () => {
    // Arrange
    const mockRetrievedObject = { owner: 'otherUser' };

    mockClass.get.mockResolvedValue(mockRetrievedObject);

    // Act
    async function runFunc() {
      await validateOwnership(mockClass, username, itemId, '');
    }

    // Assert
    await expect(runFunc).rejects.toThrow(ForbiddenError);
    expect(mockClass.get).toHaveBeenCalledWith({ id: itemId });
  });
});

// --------------------------------------------------

describe('getLastPosition', () => {
  test.each([
    [[{ position: 0 }], 0],
    [[{ position: 3 }], 3],
    [[{ position: 0 }, { position: 1 }, { position: 2 }], 2],
  ])(
    'Returns the last position in a list of relationships.',
    (relationships, expectedLastPosition) => {
      // Act
      const lastPosition = getLastPosition(relationships);

      // Assert
      expect(lastPosition).toBe(expectedLastPosition);
    }
  );

  test(
    'Returns the last position in a list of relationships that does not ' +
      'have a sequential position order.',
    () => {
      // Arrange
      const relationships = [
        { position: 3 },
        { position: 8 },
        { position: 11 },
      ];

      // Act
      const lastPosition = getLastPosition(relationships);

      // Assert
      expect(lastPosition).toBe(11);
    }
  );

  test('Returns -1 when the list is empty.', () => {
    // Arrange
    const relationships = [];

    // Act
    const lastPosition = getLastPosition(relationships);

    // Assert
    expect(lastPosition).toBe(-1);
  });
});
