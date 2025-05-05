'use strict';

const Document = require('../models/document');
const Experience = require('../models/experience');
const Document_X_Experience = require('../models/document_x_experience');
const TextSnippet = require('../models/textSnippet');
const Experience_X_Text_Snippet = require('../models/experience_x_textSnippet');
const {
  validateOwnership: mockValidateOwnership,
  getLastPosition: mockGetLastPosition,
} = require('../util/serviceHelpers');

const {
  createTextSnippet,
  createExperience_x_textSnippet,
  updateExperienceXTextSnippetsPositions,
} = require('./experienceXTextSnippetService');

const { BadRequestError, ForbiddenError } = require('../errors/appErrors');

// ==================================================

jest.mock('../models/document');
jest.mock('../models/experience');
jest.mock('../models/document_x_experience');
jest.mock('../models/textSnippet');
jest.mock('../models/experience_x_textSnippet');
jest.mock('../util/serviceHelpers');

// ==================================================

const username = 'user1';
const documentId = 1;
const experienceId = 1;
const textSnippetId = 1;
const textSnippetVersion = '2000-01-01T00:00:00.000Z';
const documentXExperienceMock = Object.freeze({ id: 1 });
const experiencesXTextSnippetsMock = Object.freeze([]);
const lastPosition = 9;
const experienceXTextSnippetMock = Object.freeze({});

// --------------------------------------------------
// createTextSnippet

describe('createTextSnippet', () => {
  const props = Object.freeze({
    type: 'plain',
    content: 'Achieved 20% reduction in cost.',
  });

  const textSnippetMock = Object.freeze({
    id: textSnippetId,
    version: textSnippetVersion,
    owner: username,
    type: props.type,
    content: props.content,
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Creates textSnippet and experienceXTextSnippet successfully.', async () => {
    // Arrange

    // For document:
    mockValidateOwnership.mockResolvedValueOnce({ isMaster: true });
    // For experience:
    mockValidateOwnership.mockResolvedValueOnce({});

    TextSnippet.add.mockResolvedValue(textSnippetMock);
    Document_X_Experience.get.mockResolvedValue(documentXExperienceMock);
    Experience_X_Text_Snippet.getAll.mockResolvedValue(
      experiencesXTextSnippetsMock
    );
    mockGetLastPosition.mockReturnValue(lastPosition);
    Experience_X_Text_Snippet.add.mockResolvedValue(experienceXTextSnippetMock);

    // Act
    const result = await createTextSnippet(
      username,
      documentId,
      experienceId,
      props
    );

    // Assert
    expect(result).toStrictEqual({
      textSnippet: textSnippetMock,
      experienceXTextSnippet: experienceXTextSnippetMock,
    });

    expect(mockValidateOwnership).toHaveBeenCalledTimes(2);
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Experience,
      username,
      { id: experienceId },
      expect.any(String)
    );

    expect(TextSnippet.add).toHaveBeenCalledWith({ ...props, owner: username });

    expect(Document_X_Experience.get).toHaveBeenCalledWith({
      documentId,
      experienceId,
    });

    expect(Experience_X_Text_Snippet.getAll).toHaveBeenCalledWith(
      documentXExperienceMock.id
    );

    expect(mockGetLastPosition).toHaveBeenCalledWith(
      experiencesXTextSnippetsMock
    );

    expect(Experience_X_Text_Snippet.add).toHaveBeenCalledWith({
      documentXExperienceId: documentXExperienceMock.id,
      textSnippetId: textSnippetMock.id,
      textSnippetVersion: textSnippetMock.version,
      position: lastPosition + 1,
    });
  });

  test('Throws ForbiddenError if document is not master.', async () => {
    // Arrange

    // For document:
    mockValidateOwnership.mockResolvedValueOnce({ isMaster: false });

    // Act
    async function runFunc() {
      await createTextSnippet(username, documentId, experienceId, props);
    }

    // Assert
    await expect(runFunc).rejects.toThrow(ForbiddenError);

    expect(mockValidateOwnership).toHaveBeenCalledTimes(1);
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );

    expect(TextSnippet.add).not.toHaveBeenCalled();
    expect(Document_X_Experience.get).not.toHaveBeenCalled();
    expect(Experience_X_Text_Snippet.getAll).not.toHaveBeenCalled();
    expect(mockGetLastPosition).not.toHaveBeenCalled();
    expect(Experience_X_Text_Snippet.add).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------
// createExperience_x_textSnippet

describe('createExperience_x_textSnippet', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Creates experienceXTextSnippet successfully.', async () => {
    // Arrange
    Document_X_Experience.get.mockResolvedValue(documentXExperienceMock);
    Experience_X_Text_Snippet.getAll.mockResolvedValue(
      experiencesXTextSnippetsMock
    );
    mockGetLastPosition.mockReturnValue(lastPosition);
    Experience_X_Text_Snippet.add.mockResolvedValue(experienceXTextSnippetMock);

    // Act
    const experienceXTextSnippet = await createExperience_x_textSnippet(
      username,
      documentId,
      experienceId,
      textSnippetId,
      textSnippetVersion
    );

    // Assert
    expect(experienceXTextSnippet).toBe(experienceXTextSnippetMock);

    expect(mockValidateOwnership).toHaveBeenCalledTimes(3);
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Experience,
      username,
      { id: experienceId },
      expect.any(String)
    );
    expect(mockValidateOwnership).toHaveBeenCalledWith(
      TextSnippet,
      username,
      { id: textSnippetId, version: textSnippetVersion },
      expect.any(String)
    );

    expect(Document_X_Experience.get).toHaveBeenCalledWith({
      documentId,
      experienceId,
    });

    expect(Experience_X_Text_Snippet.getAll).toHaveBeenCalledWith(
      documentXExperienceMock.id
    );

    expect(mockGetLastPosition).toHaveBeenCalledWith(
      experiencesXTextSnippetsMock
    );

    expect(Experience_X_Text_Snippet.add).toHaveBeenCalledWith({
      documentXExperienceId: documentXExperienceMock.id,
      textSnippetId,
      textSnippetVersion,
      position: lastPosition + 1,
    });
  });
});

// --------------------------------------------------
// updateExperienceXTextSnippetsPositions

describe('updateExperienceXTextSnippetsPositions', () => {
  const experiencesXTextSnippetsMock = Object.freeze(
    [{ textSnippetId: 1 }, { textSnippetId: 2 }, { textSnippetId: 3 }].map(
      (item) => Object.freeze(item)
    )
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Updates positions and returns ordered text snippets.', async () => {
    // Arrange
    const textSnippetIds = Object.freeze([3, 1, 2]);
    const repositionedTextSnippetsMock = Object.freeze([]);

    Document_X_Experience.get.mockResolvedValue(documentXExperienceMock);
    Experience_X_Text_Snippet.getAll.mockResolvedValue(
      experiencesXTextSnippetsMock
    );
    TextSnippet.getAllForExperienceInDocument.mockResolvedValue(
      repositionedTextSnippetsMock
    );

    // Act
    const updatedTextSnippets = await updateExperienceXTextSnippetsPositions(
      username,
      documentId,
      experienceId,
      textSnippetIds
    );

    // Assert
    expect(updatedTextSnippets).toBe(repositionedTextSnippetsMock);

    expect(mockValidateOwnership).toHaveBeenCalledWith(
      Document,
      username,
      { id: documentId },
      expect.any(String)
    );

    expect(Document_X_Experience.get).toHaveBeenCalledWith({
      documentId,
      experienceId,
    });

    expect(Experience_X_Text_Snippet.getAll).toHaveBeenCalledWith(
      documentXExperienceMock.id
    );

    expect(Experience_X_Text_Snippet.updateAllPositions).toHaveBeenCalledWith(
      documentXExperienceMock.id,
      textSnippetIds
    );

    expect(TextSnippet.getAllForExperienceInDocument).toHaveBeenCalledWith(
      username,
      documentId,
      experienceId
    );
  });

  test.each([[[3, 1]], [[3, 1, 2, 4]]])(
    'Throws an Error if number of IDs does not match.',
    async (textSnippetIds) => {
      // Arrange
      Document_X_Experience.get.mockResolvedValue(documentXExperienceMock);
      Experience_X_Text_Snippet.getAll.mockResolvedValue(
        experiencesXTextSnippetsMock
      );

      // Act
      async function runFunc() {
        await updateExperienceXTextSnippetsPositions(
          username,
          documentId,
          experienceId,
          textSnippetIds
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

      expect(Document_X_Experience.get).toHaveBeenCalledWith({
        documentId,
        experienceId,
      });

      expect(Experience_X_Text_Snippet.getAll).toHaveBeenCalledWith(
        documentXExperienceMock.id
      );

      expect(
        Experience_X_Text_Snippet.updateAllPositions
      ).not.toHaveBeenCalled();
      expect(TextSnippet.getAllForExperienceInDocument).not.toHaveBeenCalled();
    }
  );

  test('Throws an Error if text snippet IDs mismatch.', async () => {
    // Arrange
    const textSnippetIds = [1, 2, 4];

    Document_X_Experience.get.mockResolvedValue(documentXExperienceMock);
    Experience_X_Text_Snippet.getAll.mockResolvedValue(
      experiencesXTextSnippetsMock
    );

    // Act
    async function runFunc() {
      await updateExperienceXTextSnippetsPositions(
        username,
        documentId,
        experienceId,
        textSnippetIds
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

    expect(Document_X_Experience.get).toHaveBeenCalledWith({
      documentId,
      experienceId,
    });

    expect(Experience_X_Text_Snippet.getAll).toHaveBeenCalledWith(
      documentXExperienceMock.id
    );

    expect(Experience_X_Text_Snippet.updateAllPositions).not.toHaveBeenCalled();
    expect(TextSnippet.getAllForExperienceInDocument).not.toHaveBeenCalled();
  });
});
