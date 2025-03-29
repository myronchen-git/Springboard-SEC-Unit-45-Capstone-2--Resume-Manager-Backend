'use strict';

const Document = require('../models/document');
const Education = require('../models/education');
const Document_X_Education = require('../models/document_x_education');
const {
  createEducation,
  createDocument_x_education,
  updateEducation,
} = require('./educationService');
const {
  validateOwnership: mockValidateOwnership,
  getLastPosition: mockGetLastPosition,
} = require('../util/serviceHelpers');

const { BadRequestError } = require('../errors/appErrors');
const { ForbiddenError } = require('../errors/appErrors');

const { documents_x_educations } = require('../_testData');

// ==================================================

jest.mock('../util/serviceHelpers');
jest.mock('../models/document_x_education');
jest.mock('../models/education');

// ==================================================

const username = 'user1';
const documentId = 1;

// --------------------------------------------------
// createEducation

describe('createEducation', () => {
  const mockProps = Object.freeze({ school: 'University' });
  const mockDocument = { isMaster: true };
  const mockEducation = Object.freeze({ id: 123 });
  const mockDocuments_x_educations = Object.freeze({});
  const lastPosition = 9;
  const mockDocument_x_education = Object.freeze({});

  beforeEach(() => {
    mockValidateOwnership.mockReset();
    Education.add.mockReset();
    Document_X_Education.getAll.mockReset();
    mockGetLastPosition.mockReset();
    Document_X_Education.add.mockReset();
  });

  test(
    'Creates a new education and positions it in a document, ' +
      'if document belongs to user.',
    async () => {
      // Arrange
      mockValidateOwnership.mockResolvedValue(mockDocument);
      Education.add.mockResolvedValue(mockEducation);
      Document_X_Education.getAll.mockResolvedValue(mockDocuments_x_educations);
      mockGetLastPosition.mockReturnValue(lastPosition);
      Document_X_Education.add.mockResolvedValue(mockDocument_x_education);

      // Act
      const { education, document_x_education } = await createEducation(
        username,
        documentId,
        mockProps
      );

      // Assert
      expect(education).toEqual(mockEducation);
      expect(document_x_education).toEqual(mockDocument_x_education);

      expect(mockValidateOwnership).toHaveBeenCalledWith(
        Document,
        username,
        documentId,
        expect.any(String)
      );

      expect(Education.add).toHaveBeenCalledWith({
        ...mockProps,
        owner: username,
      });

      expect(Document_X_Education.getAll).toHaveBeenCalledWith(documentId);

      expect(mockGetLastPosition).toHaveBeenCalledWith(
        mockDocuments_x_educations
      );

      expect(Document_X_Education.add).toHaveBeenCalledWith({
        documentId,
        educationId: mockEducation.id,
        position: lastPosition + 1,
      });
    }
  );

  test('The position of the new education is after the last (highest) one.', async () => {
    // Arrange
    mockValidateOwnership.mockResolvedValue(mockDocument);
    Education.add.mockResolvedValue(mockEducation);
    Document_X_Education.getAll.mockResolvedValue(mockDocuments_x_educations);
    mockGetLastPosition.mockReturnValue(lastPosition);
    Document_X_Education.add.mockResolvedValue(mockDocument_x_education);

    // Act
    await createEducation(username, documentId, mockProps);

    // Assert
    expect(Document_X_Education.add).toHaveBeenCalledWith(
      expect.objectContaining({ position: lastPosition + 1 })
    );
  });

  test(
    'The position of the new education is 0 if there are no existing ' +
      'educations in the document.',
    async () => {
      // Arrange
      const lastPosition = -1;

      mockValidateOwnership.mockResolvedValue(mockDocument);
      Education.add.mockResolvedValue(mockEducation);
      Document_X_Education.getAll.mockResolvedValue(mockDocuments_x_educations);
      mockGetLastPosition.mockReturnValue(lastPosition);
      Document_X_Education.add.mockResolvedValue(mockDocument_x_education);

      // Act
      await createEducation(username, documentId, mockProps);

      // Assert
      expect(Document_X_Education.add).toHaveBeenCalledWith(
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
      await createEducation(username, documentId, mockProps);
    }

    // Assert
    await expect(runFunc).rejects.toThrow(ForbiddenError);
    expect(Education.add).not.toHaveBeenCalled();
    expect(Document_X_Education.getAll).not.toHaveBeenCalled();
    expect(mockGetLastPosition).not.toHaveBeenCalled();
    expect(Document_X_Education.add).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------
// createDocument_x_education

describe('createDocument_x_education', () => {
  beforeEach(() => {
    mockValidateOwnership.mockReset();
    Document_X_Education.getAll.mockReset();
    mockGetLastPosition.mockReset();
    Document_X_Education.add.mockReset();
  });

  test.each([
    [Object.freeze([]), -1],
    [documents_x_educations, 1],
  ])(
    'Adds a Document_X_Education, if document is found and belongs to user, ' +
      'and at the correct next position.  Existing documents_x_educations = %j.',
    async (existingDocuments_x_educations, lastPosition) => {
      // Arrange
      const educationIdToAdd = 3;

      const mockDocument_x_education = Object.freeze({});
      Document_X_Education.getAll.mockResolvedValue(
        existingDocuments_x_educations
      );
      mockGetLastPosition.mockReturnValue(lastPosition);
      Document_X_Education.add.mockResolvedValue(mockDocument_x_education);

      // Act
      const document_x_education = await createDocument_x_education(
        username,
        documentId,
        educationIdToAdd
      );

      // Assert
      expect(document_x_education).toBe(mockDocument_x_education);

      expect(mockValidateOwnership).toHaveBeenNthCalledWith(
        1,
        Education,
        username,
        educationIdToAdd,
        expect.any(String)
      );

      expect(mockValidateOwnership).toHaveBeenNthCalledWith(
        2,
        Document,
        username,
        documentId,
        expect.any(String)
      );

      expect(Document_X_Education.getAll).toHaveBeenCalledWith(documentId);

      expect(mockGetLastPosition).toHaveBeenCalledWith(
        existingDocuments_x_educations
      );

      expect(Document_X_Education.add).toHaveBeenCalledWith({
        documentId,
        educationId: educationIdToAdd,
        position: lastPosition + 1,
      });
    }
  );

  test(
    'Throws a BadRequestError if adding a Document_X_Education results in ' +
      'a duplicate primary key database error.',
    async () => {
      // Arrange
      const educationIdToAdd = 3;
      const existingDocuments_x_educations = Object.freeze([]);
      const lastPosition = -1;

      const mockDatabaseError = { code: '23505' };

      Document_X_Education.getAll.mockResolvedValue(
        existingDocuments_x_educations
      );
      mockGetLastPosition.mockReturnValue(lastPosition);
      Document_X_Education.add.mockRejectedValue(mockDatabaseError);

      // Act
      async function runFunc() {
        await createDocument_x_education(
          username,
          documentId,
          educationIdToAdd
        );
      }

      // Assert
      await expect(runFunc).rejects.toThrow(BadRequestError);

      expect(mockValidateOwnership).toHaveBeenNthCalledWith(
        1,
        Education,
        username,
        educationIdToAdd,
        expect.any(String)
      );

      expect(mockValidateOwnership).toHaveBeenNthCalledWith(
        2,
        Document,
        username,
        documentId,
        expect.any(String)
      );

      expect(Document_X_Education.getAll).toHaveBeenCalledWith(documentId);

      expect(mockGetLastPosition).toHaveBeenCalledWith(
        existingDocuments_x_educations
      );

      expect(Document_X_Education.add).toHaveBeenCalledWith({
        documentId,
        educationId: educationIdToAdd,
        position: lastPosition + 1,
      });
    }
  );
});

// --------------------------------------------------
// updateEducation

describe('updateEducation', () => {
  const educationId = 1;
  const props = Object.freeze({ school: 'University 10' });

  const mockUpdatedEducation = Object.freeze({});
  const getMockOriginalEducation = (owner) =>
    Object.freeze({
      owner,
      update: jest.fn(async () => mockUpdatedEducation),
    });

  beforeEach(() => {
    mockValidateOwnership.mockReset();
  });

  test('Updates an education.', async () => {
    // Arrange
    const mockOriginalEducation = getMockOriginalEducation(username);
    const document = { owner: username, isMaster: true };

    mockValidateOwnership.mockImplementation((modelClass) => {
      switch (modelClass) {
        case Education:
          return mockOriginalEducation;
        case Document:
          return document;
      }
    });

    // Act
    const updatedEducation = await updateEducation(
      username,
      documentId,
      educationId,
      props
    );

    // Assert
    expect(updatedEducation).toBe(mockUpdatedEducation);

    expect(mockValidateOwnership).toHaveBeenNthCalledWith(
      1,
      Education,
      username,
      educationId,
      expect.any(String)
    );

    expect(mockValidateOwnership).toHaveBeenNthCalledWith(
      2,
      Document,
      username,
      documentId,
      expect.any(String)
    );

    expect(mockOriginalEducation.update).toHaveBeenCalledWith(props);
  });

  test('Throws an Error if document is not master.', async () => {
    // Arrange
    const mockOriginalEducation = getMockOriginalEducation(username);
    const document = { owner: username, isMaster: false };

    mockValidateOwnership.mockImplementation((modelClass) => {
      switch (modelClass) {
        case Education:
          return mockOriginalEducation;
        case Document:
          return document;
      }
    });

    // Act
    async function runFunc() {
      await updateEducation(username, documentId, educationId, props);
    }

    // Assert
    await expect(runFunc).rejects.toThrow(ForbiddenError);

    expect(mockValidateOwnership).toHaveBeenNthCalledWith(
      1,
      Education,
      username,
      educationId,
      expect.any(String)
    );

    expect(mockValidateOwnership).toHaveBeenNthCalledWith(
      2,
      Document,
      username,
      documentId,
      expect.any(String)
    );

    expect(mockOriginalEducation.update).not.toHaveBeenCalled();
  });
});
