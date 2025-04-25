'use strict';

const request = require('supertest');

const app = require('../app');
const db = require('../database/db');

const Document = require('../models/document');
const Education = require('../models/education');
const Document_X_Education = require('../models/document_x_education');
const { users, educations } = require('../_testData');
const {
  urlRegisterUser,
  getDocumentsGeneralUrl,
  getEducationsGeneralUrl,
  getEducationsSpecificUrl,
  getAllEducationsUrl,
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

const educationsForRawClientInputs = Object.freeze(
  educations.map((education) => {
    const educationCopy = { ...education };
    delete educationCopy.owner;
    return Object.freeze(educationCopy);
  })
);

const username = users[0].username;
const authTokens = [];
const masterDocumentIds = [];

beforeAll(async () => {
  // Clear all tables.
  await commonBeforeAll(db);

  // Creating users.
  let responses = await Promise.all(
    users.map((user) =>
      request(app).post(urlRegisterUser).send({
        username: user.username,
        password: user.password,
      })
    )
  );

  // Saving the authentication tokens for users.
  responses.forEach((resp) => authTokens.push(resp.body.authToken));

  // Getting the master resume for each user.
  responses = await Promise.all(
    users.map((user, i) =>
      request(app)
        .get(getDocumentsGeneralUrl(user.username))
        .set('authorization', `Bearer ${authTokens[i]}`)
    )
  );

  // Saving the IDs of the master resumes.
  responses.forEach((resp) =>
    masterDocumentIds.push(resp.body.documents[0].id)
  );
});

afterAll(() => commonAfterAll(db));

// --------------------------------------------------
// POST /users/:username/documents/:documentId/educations

describe('POST /users/:username/documents/:documentId/educations', () => {
  beforeEach(() => clearTable(db, Document_X_Education.tableName));

  afterAll(() => clearTable(db, Education.tableName));

  test.each([
    [educationsForRawClientInputs[0]],
    [educationsForRawClientInputs[1]],
  ])('Adds a new education to a document.', async (educationInputData) => {
    // Arrange
    const authToken = authTokens[0];
    const documentId = masterDocumentIds[0];

    // Act
    const resp = await request(app)
      .post(getEducationsGeneralUrl(username, documentId))
      .send(educationInputData)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(201);

    const expectedEducation = {
      ...educationInputData,
      id: expect.any(Number),
      owner: username,
      gpa: educationInputData.gpa ?? null,
      awardsAndHonors: educationInputData.awardsAndHonors ?? null,
      activities: educationInputData.activities ?? null,
    };
    const expectedDocument_x_education = {
      documentId,
      educationId: expect.any(Number),
      position: 0,
    };

    expect(resp.body).toEqual({
      education: expectedEducation,
      document_x_education: expectedDocument_x_education,
    });
  });

  test(
    'Adds a new education to a document at the correct position ' +
      'when there are multiple non-sequential, out-of-order educations.',
    async () => {
      // Arrange
      const authToken = authTokens[0];
      const documentId = masterDocumentIds[0];
      const educationInputData = educationsForRawClientInputs[0];

      for (let i = 0; i < 4; i++) {
        await request(app)
          .post(getEducationsGeneralUrl(username, documentId))
          .send(educationInputData)
          .set('authorization', `Bearer ${authToken}`);
      }

      await request(app)
        .put(getEducationsGeneralUrl(username, documentId))
        .send([4, 1, 2, 3])
        .set('authorization', `Bearer ${authToken}`);

      await request(app)
        .delete(getEducationsSpecificUrl(username, documentId, 1))
        .set('authorization', `Bearer ${authToken}`);

      // Act
      const resp = await request(app)
        .post(getEducationsGeneralUrl(username, documentId))
        .send(educationInputData)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(201);

      expect(resp.body.document_x_education.position).toBe(4);
    }
  );

  test('Giving an invalid document ID in the URL should return 400 status.', async () => {
    // Arrange
    const authToken = authTokens[0];
    const documentId = 'invalid';
    const educationInputData = educationsForRawClientInputs[0];

    // Act
    const resp = await request(app)
      .post(getEducationsGeneralUrl(username, documentId))
      .send(educationInputData)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(400);
    expect(resp.body).not.toHaveProperty('education');
    expect(resp.body).not.toHaveProperty('document_x_education');
  });

  test('Giving an invalid education property should return 400 status.', async () => {
    // Arrange
    const authToken = authTokens[0];
    const documentId = masterDocumentIds[0];
    const educationInputData = {
      ...educationsForRawClientInputs[0],
      startDate: '03-03-2003',
    };

    // Act
    const resp = await request(app)
      .post(getEducationsGeneralUrl(username, documentId))
      .send(educationInputData)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(400);
    expect(resp.body).not.toHaveProperty('education');
    expect(resp.body).not.toHaveProperty('document_x_education');
  });

  test(
    'Adding to a document that is not the master resume ' +
      'should return 403 status.',
    async () => {
      // Arrange
      const authToken = authTokens[0];
      const educationInputData = educationsForRawClientInputs[0];

      let resp = await request(app)
        .post(getDocumentsGeneralUrl(username))
        .send({
          documentName: 'Not Master',
          isTemplate: false,
        })
        .set('authorization', `Bearer ${authToken}`);

      const documentId = resp.body.document.id;

      // Act
      resp = await request(app)
        .post(getEducationsGeneralUrl(username, documentId))
        .send(educationInputData)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(403);
      expect(resp.body).not.toHaveProperty('education');
      expect(resp.body).not.toHaveProperty('document_x_education');
    }
  );

  test(
    'Adding an education to a nonexistent document ' +
      'should return 404 status.',
    async () => {
      // Arrange
      const authToken = authTokens[0];
      const nonexistentDocumentId = 999;
      const educationInputData = educationsForRawClientInputs[0];

      // Act
      const resp = await request(app)
        .post(getEducationsGeneralUrl(username, nonexistentDocumentId))
        .send(educationInputData)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(404);
      expect(resp.body).not.toHaveProperty('education');
      expect(resp.body).not.toHaveProperty('document_x_education');
    }
  );

  test(
    "Attempting to access another user's document " +
      'should return 403 status.',
    async () => {
      // Arrange
      const authToken = authTokens[0];
      const documentId = masterDocumentIds[1];
      const educationInputData = educationsForRawClientInputs[0];

      // Act
      const resp = await request(app)
        .post(getEducationsGeneralUrl(username, documentId))
        .send(educationInputData)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(403);
      expect(resp.body).not.toHaveProperty('education');
      expect(resp.body).not.toHaveProperty('document_x_education');
    }
  );
});

// --------------------------------------------------
// POST /users/:username/documents/:documentId/educations/:educationId

describe('POST /users/:username/documents/:documentId/educations/:educationId', () => {
  let authToken;
  let documentId;

  beforeAll(async () => {
    authToken = authTokens[0];
    documentId = masterDocumentIds[0];

    // Adding educations into database.
    for (const educationInputData of educationsForRawClientInputs) {
      await request(app)
        .post(getEducationsGeneralUrl(username, documentId))
        .send(educationInputData)
        .set('authorization', `Bearer ${authToken}`);
    }
  });

  beforeEach(() => clearTable(db, Document_X_Education.tableName));

  afterAll(() => clearTable(db, Education.tableName));

  test('Adds a new document-education relationship.', async () => {
    // Arrange
    const educationId = 1;

    // Act
    const resp = await request(app)
      .post(getEducationsSpecificUrl(username, documentId, educationId))
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(201);

    expect(resp.body).toEqual({
      document_x_education: {
        documentId,
        educationId,
        position: 0,
      },
    });
  });

  test(
    'Adds a new document-education relationship at the correct position ' +
      'if there already exists multiples.',
    async () => {
      // Ensure that there are enough educations.
      expect(educationsForRawClientInputs.length).toBeGreaterThanOrEqual(2);

      // Arrange
      await request(app)
        .post(getEducationsSpecificUrl(username, documentId, 1))
        .set('authorization', `Bearer ${authToken}`);

      // Act
      const resp = await request(app)
        .post(getEducationsSpecificUrl(username, documentId, 2))
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(201);

      expect(resp.body).toEqual({
        document_x_education: {
          documentId,
          educationId: 2,
          position: 1,
        },
      });
    }
  );

  test(
    'Adds a new document-education relationship at the correct position ' +
      'when existing ones are non-sequential.',
    async () => {
      // Ensure that there are enough educations.
      expect(educationsForRawClientInputs.length).toBeGreaterThanOrEqual(2);

      // Arrange
      // Manually inserting relationships to simplify set up.  Otherwise, there
      // will be many calls to create, delete, and reposition relationships.
      await db.query({
        queryConfig: {
          text: `
  INSERT INTO documents_x_educations (document_id, education_id, position)
    VALUES (${documentId}, 1, 9),
           (${documentId}, 2, 3);`,
        },
      });

      // Adding one more education so that there's at least 3.  At least 3 is
      // needed to make this test valid.
      await request(app)
        .post(getEducationsGeneralUrl(username, documentId))
        .send(educationsForRawClientInputs[0])
        .set('authorization', `Bearer ${authToken}`);

      // Remove relationship, that was created automatically from above new
      // education request, to generalize environment to any resume and not only
      // the master resume.
      await db.query({
        queryConfig: {
          text: `
  DELETE FROM documents_x_educations
  WHERE document_id=${documentId} AND education_id=3`,
        },
      });

      // Act
      const resp = await request(app)
        .post(getEducationsSpecificUrl(username, documentId, 3))
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(201);

      expect(resp.body).toEqual({
        document_x_education: {
          documentId,
          educationId: 3,
          position: 10,
        },
      });
    }
  );

  test(
    'Adding a relationship with a nonexistent document ' +
      'should return 404 status.',
    async () => {
      // Arrange
      const nonexistentDocumentId = 99;
      const educationId = 1;

      // Act
      const resp = await request(app)
        .post(
          getEducationsSpecificUrl(username, nonexistentDocumentId, educationId)
        )
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(404);
      expect(resp.body).not.toHaveProperty('document_x_education');
    }
  );

  test(
    'Adding a relationship with a nonexistent education ' +
      'should return 404 status.',
    async () => {
      // Arrange
      const nonexistentEducationId = 99;

      // Act
      const resp = await request(app)
        .post(
          getEducationsSpecificUrl(username, documentId, nonexistentEducationId)
        )
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(404);
      expect(resp.body).not.toHaveProperty('document_x_education');
    }
  );

  test(
    "Attempting to access another user's document " +
      'should return 403 status.',
    async () => {
      // Ensure there are enough users.
      expect(users.length).toBeGreaterThanOrEqual(2);

      // Arrange
      const educationId = 1;

      // Act
      const resp = await request(app)
        .post(
          getEducationsSpecificUrl(users[0].username, documentId, educationId)
        )
        .set('authorization', `Bearer ${authTokens[1]}`);

      // Assert
      expect(resp.statusCode).toBe(403);
      expect(resp.body).not.toHaveProperty('document_x_education');
    }
  );
});

// --------------------------------------------------
// GET /users/:username/educations

describe('GET /users/:username/educations', () => {
  let authToken;
  let documentId;

  beforeAll(async () => {
    authToken = authTokens[0];
    documentId = masterDocumentIds[0];
  });

  beforeEach(() => clearTable(db, Education.tableName));

  afterAll(() => clearTable(db, Education.tableName));

  test.each([
    [educationsForRawClientInputs, users[0].username], // many
    [[], users[1].username], // zero
  ])('Get all educations from a user.', async (educationInputs, username) => {
    // Arrange
    // Adding educations into database.
    for (const educationInputData of educationInputs) {
      await request(app)
        .post(getEducationsGeneralUrl(username, documentId))
        .send(educationInputData)
        .set('authorization', `Bearer ${authToken}`);
    }

    // Act
    const resp = await request(app)
      .get(getAllEducationsUrl(username))
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(200);

    const expectedEducations = educationInputs.map((education, idx) => {
      const expectedEducation = {
        ...education,
        id: idx + 1,
        owner: username,
      };

      expectedEducation.gpa ||= null;
      expectedEducation.awardsAndHonors ||= null;
      expectedEducation.activities ||= null;

      return expectedEducation;
    });

    expect(resp.body).toEqual({ educations: expectedEducations });
  });
});

// --------------------------------------------------
// PATCH /users/:username/documents/:documentId/educations/:educationId

describe('PATCH /users/:username/documents/:documentId/educations/:educationId', () => {
  let authToken;
  let documentId;
  let educationId;

  const updatedProps = Object.freeze({
    school: 'updated school name',
    location: 'updated school location',
  });

  beforeAll(async () => {
    authToken = authTokens[0];
    documentId = masterDocumentIds[0];
  });

  beforeEach(async () => {
    await clearTable(db, Education.tableName);

    // Adding an education into database.
    const resp = await request(app)
      .post(getEducationsGeneralUrl(username, documentId))
      .send(educationsForRawClientInputs[0])
      .set('authorization', `Bearer ${authToken}`);

    educationId = resp.body.education.id;
  });

  afterAll(() => clearTable(db, Education.tableName));

  test('Updates an education.', async () => {
    // Act
    const resp = await request(app)
      .patch(getEducationsSpecificUrl(username, documentId, educationId))
      .send(updatedProps)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(200);

    const expectedEducation = {
      ...educations[0],
      ...updatedProps,
      id: educationId,
    };
    expectedEducation.gpa ||= null;
    expectedEducation.awardsAndHonors ||= null;
    expectedEducation.activities ||= null;

    expect(resp.body).toEqual({ education: expectedEducation });
  });

  test(
    'Giving an invalid document ID in the URL ' + 'should return 400 status.',
    async () => {
      // Arrange
      const invalidDocumentId = 'invalid';

      // Act
      const resp = await request(app)
        .patch(
          getEducationsSpecificUrl(username, invalidDocumentId, educationId)
        )
        .send(updatedProps)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(400);
      expect(resp.body).not.toHaveProperty('education');
    }
  );

  test(
    'Giving an invalid education property ' + 'should return 400 status.',
    async () => {
      // Arrange
      const invalidUpdatedProps = { ...updatedProps, startDate: '03-03-2003' };

      // Act
      const resp = await request(app)
        .patch(getEducationsSpecificUrl(username, documentId, educationId))
        .send(invalidUpdatedProps)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(400);
      expect(resp.body).not.toHaveProperty('education');
    }
  );

  test(
    'Updating an education not in the master resume ' +
      'should return 403 status.',
    async () => {
      // Arrange
      // Adding another resume.
      const notMasterDocumentId = (
        await request(app)
          .post(getDocumentsGeneralUrl(username))
          .send({ documentName: 'Resume 2', isTemplate: false })
          .set('authorization', `Bearer ${authToken}`)
      ).body.document.id;

      // Act
      const resp = await request(app)
        .patch(
          getEducationsSpecificUrl(username, notMasterDocumentId, educationId)
        )
        .send(updatedProps)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(403);
      expect(resp.body).not.toHaveProperty('education');

      // Clean up
      await Document.delete(notMasterDocumentId);
    }
  );

  test(
    'Updating an education in a nonexistent document' +
      'should return 404 status.',
    async () => {
      // Arrange
      const nonexistentDocumentId = 99;

      // Act
      const resp = await request(app)
        .patch(
          getEducationsSpecificUrl(username, nonexistentDocumentId, educationId)
        )
        .send(updatedProps)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(404);
      expect(resp.body).not.toHaveProperty('education');
    }
  );

  test('Updating a nonexistent education should return 404 status.', async () => {
    // Arrange
    const nonexistentEducationId = 99;

    // Act
    const resp = await request(app)
      .patch(
        getEducationsSpecificUrl(username, documentId, nonexistentEducationId)
      )
      .send(updatedProps)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(404);
    expect(resp.body).not.toHaveProperty('education');
  });

  test(
    "Attempting to access another user's document " +
      'should return 403 status.',
    async () => {
      // Arrange
      const otherAuthToken = authTokens[1];

      // Act
      const resp = await request(app)
        .patch(getEducationsSpecificUrl(username, documentId, educationId))
        .send(updatedProps)
        .set('authorization', `Bearer ${otherAuthToken}`);

      // Assert
      expect(resp.statusCode).toBe(403);
      expect(resp.body).not.toHaveProperty('education');
    }
  );

  test("Updating another user's education should return 403 status.", async () => {
    // Arrange
    // Adding another user's education into database.
    let resp = await request(app)
      .post(getEducationsGeneralUrl(users[1].username, masterDocumentIds[1]))
      .send(educationsForRawClientInputs[0])
      .set('authorization', `Bearer ${authTokens[1]}`);

    const otherEducationId = resp.body.education.id;

    // Act
    resp = await request(app)
      .patch(getEducationsSpecificUrl(username, documentId, otherEducationId))
      .send(updatedProps)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(403);
    expect(resp.body).not.toHaveProperty('education');
  });
});
