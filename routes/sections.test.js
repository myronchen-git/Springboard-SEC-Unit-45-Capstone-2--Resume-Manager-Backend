'use strict';

const request = require('supertest');

const app = require('../app');
const db = require('../database/db');

const Document = require('../models/document');
const Document_X_Section = require('../models/document_x_section');
const { shuffle } = require('../util/array');
const { users, sections } = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

const urlPrefix = '/api/v1';
const urlRegisterUser = `${urlPrefix}/auth/register`;
const getCreateDocumentSectionRelationshipUrl = (
  username,
  documentId,
  sectionId
) =>
  `${urlPrefix}/users/${username}/documents/${documentId}/sections/${sectionId}`;
const getGetAllDocumentsUrl = (username) =>
  `${urlPrefix}/users/${username}/documents`;

const authTokens = [];

const existingSections = Object.freeze(
  sections.map((section, idx) =>
    Object.freeze({
      id: idx + 1,
      sectionName: section.sectionName,
    })
  )
);

beforeAll(() =>
  commonBeforeAll(db)
    .then(() => {
      // Have to manually and directly insert sections here, because sections
      // are pre-created.  In other words, they are seeded into the database
      // upon database creation and not created thru the API.
      const sqlValuesText = sections.map(
        (section) => `\n    ('${section.sectionName}')`
      );

      const text =
        `
  INSERT INTO sections (section_name) VALUES` +
        sqlValuesText.join() +
        ';';

      return db.query({ queryConfig: { text } });
    })
    .then(() =>
      Promise.all(
        users.map((user) =>
          request(app).post(urlRegisterUser).send({
            username: user.username,
            password: user.password,
          })
        )
      )
    )
    .then((responses) => {
      responses.forEach((resp) => authTokens.push(resp.body.authToken));
    })
);

afterAll(() => commonAfterAll(db));

// --------------------------------------------------
// GET /sections

describe('GET /sections', () => {
  const url = `${urlPrefix}/sections`;

  test('Gets all pre-created sections.', async () => {
    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(200);

    const expectedSections = sections.map((section, idx) => ({
      id: idx + 1,
      sectionName: section.sectionName,
    }));

    expect(resp.body).toEqual({ sections: expectedSections });
  });
});

// --------------------------------------------------
// POST /users/:username/documents/:docId/sections/:sectionId

describe('POST /users/:username/documents/:docId/sections/:sectionId', () => {
  const user = users[0];
  let authToken;
  let documentId;

  // Need to set authToken in beforeAll, because all variable declarations
  // outside of these setup functions are run first.
  beforeAll(async () => {
    authToken = authTokens[0];
    documentId = (await Document.getAll(user.username))[0].id;
  });

  beforeEach(() => clearTable(db, Document_X_Section.tableName));

  test('Adds a new document-section relationship.', async () => {
    // Arrange
    const sectionId = 1;

    // Act
    const resp = await request(app)
      .post(
        getCreateDocumentSectionRelationshipUrl(
          user.username,
          documentId,
          sectionId
        )
      )
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(201);

    expect(resp.body).toEqual({
      document_x_section: {
        documentId,
        sectionId,
        position: 0,
      },
    });
  });

  test(
    'Adds a new document-section relationship at the correct position ' +
      'if there already exists multiples.',
    async () => {
      // Ensure that there are enough sections.
      expect(sections.length).toBeGreaterThanOrEqual(2);

      // Arrange
      await request(app)
        .post(
          getCreateDocumentSectionRelationshipUrl(user.username, documentId, 1)
        )
        .set('authorization', `Bearer ${authToken}`);

      // Act
      const resp = await request(app)
        .post(
          getCreateDocumentSectionRelationshipUrl(user.username, documentId, 2)
        )
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(201);

      expect(resp.body).toEqual({
        document_x_section: {
          documentId,
          sectionId: 2,
          position: 1,
        },
      });
    }
  );

  test(
    'Adds a new document-section relationship at the correct position ' +
      'when existing ones are non-sequential.',
    async () => {
      // Ensure that there are enough sections.
      expect(sections.length).toBeGreaterThanOrEqual(3);

      // Arrange
      // Manually inserting relationships to simplify set up.  Otherwise, there
      // will be many calls to create, delete, and reposition document-section
      // relationships.
      db.query({
        queryConfig: {
          text: `
  INSERT INTO documents_x_sections (document_id, section_id, position)
    VALUES (${documentId}, 1, 9),
           (${documentId}, 2, 3);`,
        },
      });

      // Act
      const resp = await request(app)
        .post(
          getCreateDocumentSectionRelationshipUrl(user.username, documentId, 3)
        )
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(201);

      expect(resp.body).toEqual({
        document_x_section: {
          documentId,
          sectionId: 3,
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
      const sectionId = 1;

      // Act
      const resp = await request(app)
        .post(
          getCreateDocumentSectionRelationshipUrl(
            user.username,
            nonexistentDocumentId,
            sectionId
          )
        )
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(404);
      expect(resp.body).not.toHaveProperty('document_x_section');
    }
  );

  test(
    "Attempting to access another user's document " +
      'should return 403 status.',
    async () => {
      // Ensure there are enough users.
      expect(users.length).toBeGreaterThanOrEqual(2);

      // Arrange
      const sectionId = 1;

      // Act
      const resp = await request(app)
        .post(
          getCreateDocumentSectionRelationshipUrl(
            users[0].username,
            documentId,
            sectionId
          )
        )
        .set('authorization', `Bearer ${authTokens[1]}`);

      // Assert
      expect(resp.statusCode).toBe(403);
      expect(resp.body).not.toHaveProperty('document_x_section');
    }
  );
});

// --------------------------------------------------
// GET /users/:username/documents/:documentId/sections

describe('GET /users/:username/documents/:documentId/sections', () => {
  const getUrl = (username, documentId) =>
    `${urlPrefix}/users/${username}/documents/${documentId}/sections`;

  const user = users[0];

  let authToken;
  let documentId;

  beforeAll(async () => {
    authToken = authTokens[0];

    // Getting document ID
    const resp = await request(app)
      .get(getGetAllDocumentsUrl(user.username))
      .set('authorization', `Bearer ${authToken}`);

    documentId = resp.body.documents[0].id;
  });

  beforeEach(() => clearTable(db, Document_X_Section.tableName));

  test.each([[[]], [existingSections]])(
    'Gets all sections of a document in the correct order.',
    async (sectionsToAttach) => {
      // Arrange
      // Adding document_x_section relationships.
      for (let i = sectionsToAttach.length - 1; i >= 0; i--) {
        await request(app)
          .post(
            getCreateDocumentSectionRelationshipUrl(
              user.username,
              documentId,
              sectionsToAttach[i].id
            )
          )
          .set('authorization', `Bearer ${authToken}`);
      }

      // Act
      const resp = await request(app)
        .get(getUrl(user.username, documentId))
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual({ sections: sectionsToAttach.toReversed() });
    }
  );

  test(
    'Getting sections of a nonexistent document ' + 'should return 404 status.',
    async () => {
      // Arrange
      const nonexistentDocumentId = 99;

      // Adding document_x_section relationships.
      for (const section of existingSections) {
        await request(app)
          .post(
            getCreateDocumentSectionRelationshipUrl(
              user.username,
              documentId,
              section.id
            )
          )
          .set('authorization', `Bearer ${authToken}`);
      }

      // Act
      const resp = await request(app)
        .get(getUrl(user.username, nonexistentDocumentId))
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(404);
      expect(resp.body).not.toHaveProperty('sections');
    }
  );

  test(
    "Attempting to access another user's document " +
      'should return 403 status.',
    async () => {
      // Arrange
      // Adding document_x_section relationships.
      for (const section of existingSections) {
        await request(app)
          .post(
            getCreateDocumentSectionRelationshipUrl(
              user.username,
              documentId,
              section.id
            )
          )
          .set('authorization', `Bearer ${authToken}`);
      }

      // Act
      const resp = await request(app)
        .get(getUrl(users[0].username, documentId))
        .set('authorization', `Bearer ${authTokens[1]}`);

      // Assert
      expect(resp.statusCode).toBe(403);
      expect(resp.body).not.toHaveProperty('sections');
    }
  );
});

// --------------------------------------------------
// PUT /users/:username/documents/:documentId/sections

describe('PUT /users/:username/documents/:documentId/sections', () => {
  const getUrl = (username, documentId) =>
    `${urlPrefix}/users/${username}/documents/${documentId}/sections`;

  const user = users[0];

  let authToken;
  let documentId;

  beforeAll(async () => {
    authToken = authTokens[0];

    // Getting document ID
    const resp = await request(app)
      .get(getGetAllDocumentsUrl(user.username))
      .set('authorization', `Bearer ${authToken}`);

    documentId = resp.body.documents[0].id;
  });

  beforeEach(async () => {
    await clearTable(db, Document_X_Section.tableName);

    // Adding document-section relationships.
    for (const section of existingSections) {
      await request(app)
        .post(
          getCreateDocumentSectionRelationshipUrl(
            user.username,
            documentId,
            section.id
          )
        )
        .set('authorization', `Bearer ${authToken}`);
    }
  });

  test('Updates section positions in a document.', async () => {
    // Arrange
    const shuffledSections = shuffle([...existingSections]);
    const updatedPositionedSections = shuffledSections.map(
      (section) => section.id
    );

    // Act
    const resp = await request(app)
      .put(getUrl(user.username, documentId))
      .send(updatedPositionedSections)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ sections: shuffledSections });
  });

  test('Returns 400 status if URL parameters are invalid.', async () => {
    // Arrange
    const invalidDocumentId = 'abc';

    const updatedPositionedSections = existingSections.map(
      (section) => section.id
    );

    // Act
    const resp = await request(app)
      .put(getUrl(user.username, invalidDocumentId))
      .send(updatedPositionedSections)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(400);
    expect(resp.body).not.toHaveProperty('sections');
  });

  test('Returns 400 status if list of section IDs are invalid types.', async () => {
    // Arrange
    const updatedPositionedSections = existingSections.map(
      (section) => section.id + 0.1
    );

    // Alternative test data for input.  Uses an Object instead of an Array of
    // floats.
    /*
    const updatedPositionedSections = existingSections.reduce(
      (obj, section, idx) => {
        obj[idx] = section.id;
        return obj;
      },
      {}
    );
    */

    // Act
    const resp = await request(app)
      .put(getUrl(user.username, documentId))
      .send(updatedPositionedSections)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(400);
    expect(resp.body).not.toHaveProperty('sections');
  });

  test(
    "Returns 400 status if not exactly all of the document's sections " +
      'are updated.',
    async () => {
      // Arrange
      const updatedPositionedSections = existingSections.map(
        (section) => section.id
      );
      updatedPositionedSections.pop();

      // Act
      const resp = await request(app)
        .put(getUrl(user.username, documentId))
        .send(updatedPositionedSections)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(400);
      expect(resp.body).not.toHaveProperty('sections');
    }
  );

  test('Returns 404 status if document is not found.', async () => {
    // Arrange
    const nonexistentDocumentId = 99;

    const updatedPositionedSections = existingSections.map(
      (section) => section.id
    );

    // Act
    const resp = await request(app)
      .put(getUrl(user.username, nonexistentDocumentId))
      .send(updatedPositionedSections)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(404);
    expect(resp.body).not.toHaveProperty('sections');
  });

  test(
    "Attempting to access another user's document " +
      'should return 403 status.',
    async () => {
      // Arrange
      const otherAuthToken = authTokens[1];

      const updatedPositionedSections = existingSections.map(
        (section) => section.id
      );

      // Act
      const resp = await request(app)
        .put(getUrl(user.username, documentId))
        .send(updatedPositionedSections)
        .set('authorization', `Bearer ${otherAuthToken}`);

      // Assert
      expect(resp.statusCode).toBe(403);
      expect(resp.body).not.toHaveProperty('sections');
    }
  );
});

// --------------------------------------------------
// DELETE /users/:username/documents/:documentId/sections/:sectionId

describe('DELETE /users/:username/documents/:documentId/sections/:sectionId', () => {
  const getUrl = (username, documentId, sectionId) =>
    `${urlPrefix}/users/${username}/documents/${documentId}/sections/${sectionId}`;

  const user = users[0];
  const section = existingSections[0];

  let authToken;
  let documentId;

  beforeAll(async () => {
    authToken = authTokens[0];

    // Getting document ID
    const resp = await request(app)
      .get(getGetAllDocumentsUrl(user.username))
      .set('authorization', `Bearer ${authToken}`);

    documentId = resp.body.documents[0].id;
  });

  beforeEach(() => clearTable(db, Document_X_Section.tableName));

  test('Removes a section from a document.', async () => {
    // Arrange
    await request(app)
      .post(
        getCreateDocumentSectionRelationshipUrl(
          user.username,
          documentId,
          section.id
        )
      )
      .set('authorization', `Bearer ${authToken}`);

    // Act
    const resp = await request(app)
      .delete(getUrl(user.username, documentId, section.id))
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(200);
  });

  test(
    'Attempting to remove a section that is not in a document ' +
      'should return 200 status.',
    async () => {
      // Arrange
      const nonexistentSectionId = 999;

      await request(app)
        .post(
          getCreateDocumentSectionRelationshipUrl(
            user.username,
            documentId,
            section.id
          )
        )
        .set('authorization', `Bearer ${authToken}`);

      // Act
      const resp = await request(app)
        .delete(getUrl(user.username, documentId, nonexistentSectionId))
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toBe(200);
    }
  );

  test('Returns 404 status if document is not found.', async () => {
    // Arrange
    const nonexistentDocumentId = 999;

    // Act
    const resp = await request(app)
      .delete(getUrl(user.username, nonexistentDocumentId, section.id))
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toBe(404);
  });

  test(
    "Attempting to access another user's document " +
      'should return 403 status.',
    async () => {
      // Act
      const resp = await request(app)
        .delete(getUrl(users[0].username, documentId, section.id))
        .set('authorization', `Bearer ${authTokens[1]}`);

      // Assert
      expect(resp.statusCode).toBe(403);
    }
  );
});
