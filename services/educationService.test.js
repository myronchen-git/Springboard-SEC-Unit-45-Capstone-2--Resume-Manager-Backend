'use strict';

const Document = require('../models/document');
const Education = require('../models/education');
const Document_X_Education = require('../models/document_x_education');
const {
  createDocument_x_education,
  updateEducation,
  updateDocument_x_educationPositions,
} = require('./educationService');
const {
  validateOwnership: mockValidateOwnership,
  getLastPosition: mockGetLastPosition,
} = require('../util/serviceHelpers');

const { BadRequestError } = require('../errors/appErrors');
const { ForbiddenError } = require('../errors/appErrors');

const { documents_x_educations } = require('../_testData');
const { shuffle } = require('../util/array');

// ==================================================

jest.mock('../util/serviceHelpers');
jest.mock('../models/document_x_education');
jest.mock('../models/education');

// ==================================================

const username = 'user1';
const documentId = 1;

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
        { id: educationIdToAdd },
        expect.any(String)
      );

      expect(mockValidateOwnership).toHaveBeenNthCalledWith(
        2,
        Document,
        username,
        { id: documentId },
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
        { id: educationIdToAdd },
        expect.any(String)
      );

      expect(mockValidateOwnership).toHaveBeenNthCalledWith(
        2,
        Document,
        username,
        { id: documentId },
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
      { id: educationId },
      expect.any(String)
    );

    expect(mockValidateOwnership).toHaveBeenNthCalledWith(
      2,
      Document,
      username,
      { id: documentId },
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
      { id: educationId },
      expect.any(String)
    );

    expect(mockValidateOwnership).toHaveBeenNthCalledWith(
      2,
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );

    expect(mockOriginalEducation.update).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------
// updateDocument_x_educationPositions

describe('updateDocument_x_educationPositions', () => {
  // Have IDs at high numbers to avoid conflicts with common test data.
  const extraEducationIds = [99];

  const educationIdsForRepositioning = documents_x_educations.map(
    (dxe) => dxe.educationId
  );
  // Adding more educationIds in case there are too few.
  educationIdsForRepositioning.push(...extraEducationIds);
  Object.freeze(educationIdsForRepositioning);

  const mockDocuments_x_educations = [...documents_x_educations];
  // Adding more documents_x_educations in case there are too few.
  mockDocuments_x_educations.push(
    ...extraEducationIds.map((extraEducationId) =>
      Object.freeze({
        documentId: 1,
        educationId: extraEducationId,
        position: extraEducationId,
      })
    )
  );

  const mockEducations = Object.freeze({});

  beforeEach(() => {
    mockValidateOwnership.mockReset();
    Document_X_Education.getAll.mockReset();
    Document_X_Education.updateAllPositions.mockReset();
    Education.getAllInDocument.mockReset();
  });

  test('Updates positions if all educations in the document are included.', async () => {
    // Arrange
    const educationIds = Object.freeze(
      shuffle([...educationIdsForRepositioning])
    );

    Document_X_Education.getAll.mockResolvedValue(mockDocuments_x_educations);
    Education.getAllInDocument.mockResolvedValue(mockEducations);

    // Act
    const repositionedEducations = await updateDocument_x_educationPositions(
      username,
      documentId,
      educationIds
    );

    // Assert
    expect(repositionedEducations).toBe(mockEducations);

    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );

    expect(Document_X_Education.getAll).toHaveBeenCalledWith(documentId);

    expect(Document_X_Education.updateAllPositions).toHaveBeenCalledWith(
      documentId,
      educationIds
    );

    expect(Education.getAllInDocument).toHaveBeenCalledWith(documentId);
  });

  test.each([
    ['less', shuffle(educationIdsForRepositioning.slice(0, -1))],
    // Ensure extra ID is even higher than other ones to avoid duplicate IDs.
    ['more', shuffle(educationIdsForRepositioning.concat([999]))],
  ])(
    'Throws an Error if %s than all educations in the document are included.',
    async (_desc, educationIds) => {
      // Arrange
      Document_X_Education.getAll.mockResolvedValue(mockDocuments_x_educations);
      Education.getAllInDocument.mockResolvedValue(mockEducations);

      // Act
      async function runFunc() {
        await updateDocument_x_educationPositions(
          username,
          documentId,
          educationIds
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

      expect(Document_X_Education.getAll).toHaveBeenCalledWith(documentId);

      expect(Document_X_Education.updateAllPositions).not.toHaveBeenCalled();
      expect(Education.getAllInDocument).not.toHaveBeenCalled();
    }
  );
});
