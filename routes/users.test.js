'use strict';

const request = require('supertest');

const app = require('../app');
const db = require('../database/db');

const ContactInfo = require('../models/contactInfo');
const { users, contactInfos } = require('../_testData');
const {
  commonBeforeAll,
  commonAfterAll,
  clearTable,
} = require('../_testCommon');

// ==================================================

const urlPrefix = '/api/v1';
const urlRegisterUser = `${urlPrefix}/auth/register`;

const authTokens = [];

beforeAll(() =>
  commonBeforeAll(db)
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
// PATCH /users/:username

describe('PATCH /users/:username', () => {
  const user = users[0];
  const url = `${urlPrefix}/users/${user.username}`;
  const validNewPassword = 'Updated' + user.password + '!@#$%';

  // Need to set authToken in beforeAll, because all variable declarations
  // outside of these setup functions are run first.
  let authToken;
  beforeAll(() => {
    authToken = authTokens[0];
  });

  test('Updates user account data.', async () => {
    // Arrange
    const updateData = Object.freeze({
      oldPassword: user.password,
      newPassword: validNewPassword,
    });

    // Act
    const resp = await request(app)
      .patch(url)
      .send(updateData)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    const expectedUserData = { ...user, ...updateData };
    delete expectedUserData.password;
    delete expectedUserData.oldPassword;
    delete expectedUserData.newPassword;

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: expectedUserData,
    });
  });

  test(
    'Updating password with incorrect old password ' +
      'should return 401 status.',
    async () => {
      // Arrange
      const updateData = Object.freeze({
        oldPassword: 'wrong password',
        newPassword: validNewPassword,
      });

      // Act
      const resp = await request(app)
        .patch(url)
        .send(updateData)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toEqual(401);
      expect(resp.body).not.toHaveProperty('user');
    }
  );

  test(
    'Updating password with invalid new password ' +
      'should return 400 status.',
    async () => {
      // Arrange
      const updateData = Object.freeze({
        oldPassword: user.password,
        newPassword: '1',
      });

      // Act
      const resp = await request(app)
        .patch(url)
        .send(updateData)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toEqual(400);
      expect(resp.body).not.toHaveProperty('user');
    }
  );
});

// --------------------------------------------------
// PUT /users/:username/contact-info

describe('PUT /users/:username/contact-info', () => {
  const getUrl = (username) => `${urlPrefix}/users/${username}/contact-info`;

  beforeEach(() => clearTable(db, ContactInfo.tableName));

  test.each(contactInfos.map((info, idx) => [idx, { ...info }]))(
    'Adds a contact info entry into database if one does not exist.  ' +
      'Field %i: %o.',
    async (idx, contactInfoData) => {
      // Arrange
      const expectedContactInfoData = { ...contactInfoData };
      expectedContactInfoData.location ||= null;
      expectedContactInfoData.email ||= null;
      expectedContactInfoData.phone ||= null;
      expectedContactInfoData.linkedin ||= null;
      expectedContactInfoData.github ||= null;

      delete contactInfoData.username;

      // Act
      const resp = await request(app)
        .put(getUrl(users[idx].username))
        .send(contactInfoData)
        .set('authorization', `Bearer ${authTokens[idx]}`);

      // Assert
      expect(resp.statusCode).toEqual(201);
      expect(resp.body).toEqual({
        contactInfo: expectedContactInfoData,
      });
    }
  );

  test(
    'Updates a contact info entry in the database if it already exists.  ' +
      'Also, empty Strings should be allowed for optional properties.',
    async () => {
      // Arrange
      const authToken = authTokens[1];

      // Ensure that this contact info data has values for all properties.
      let contactInfoData = { ...contactInfos[1] };
      delete contactInfoData.username;

      await request(app)
        .put(getUrl(users[0].username))
        .send(contactInfoData)
        .set('authorization', `Bearer ${authToken}`);

      contactInfoData = {
        fullName: 'new name',
        location: '',
        email: '',
        phone: '',
        linkedin: '',
        github: '',
      };
      const expectedContactInfoData = {
        ...contactInfoData,
        username: contactInfos[1].username,
      };
      delete contactInfoData.username;

      // Act
      const resp = await request(app)
        .put(getUrl(users[1].username))
        .send(contactInfoData)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual({
        contactInfo: expectedContactInfoData,
      });
    }
  );

  test.each([
    [
      'Giving an invalid LinkedIn URL',
      {
        fullName: contactInfos[1].fullName,
        linkedin: 'linkedin.com/user/user1',
      },
    ],
    ['Missing full name', { location: contactInfos[1].location }],
  ])(
    '%s when creating a new database entry should return 400 status.',
    async (testTitle, contactInfoData) => {
      // Arrange
      const user = users[0];
      const authToken = authTokens[0];

      // Act
      const resp = await request(app)
        .put(getUrl(user.username))
        .send(contactInfoData)
        .set('authorization', `Bearer ${authToken}`);

      // Assert
      expect(resp.statusCode).toEqual(400);
      expect(resp.body).not.toHaveProperty('contactInfo');
    }
  );

  test('Updating full name to an empty String should return 400 status.', async () => {
    // Arrange
    const user = users[0];
    const authToken = authTokens[1];

    // Ensure that this contact info data has values for all properties.
    let contactInfoData = { ...contactInfos[1] };
    delete contactInfoData.username;

    await request(app)
      .put(getUrl(user.username))
      .send(contactInfoData)
      .set('authorization', `Bearer ${authToken}`);

    contactInfoData = { fullName: '' };

    // Act
    const resp = await request(app)
      .put(getUrl(user.username))
      .send(contactInfoData)
      .set('authorization', `Bearer ${authToken}`);

    // Assert
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).not.toHaveProperty('contactInfo');
  });
});

// --------------------------------------------------
// GET /users/:username/contact-info

describe('GET /users/:username/contact-info', () => {
  const getUrl = (username) => `${urlPrefix}/users/${username}/contact-info`;

  beforeEach(() => clearTable(db, ContactInfo.tableName));

  test.each(contactInfos.map((info, idx) => [idx, { ...info }]))(
    'Retrieves contact info for a user.  Field %i: %o.',
    async (idx, contactInfoData) => {
      // Arrange
      const expectedContactInfoData = { ...contactInfoData };
      expectedContactInfoData.location ||= null;
      expectedContactInfoData.email ||= null;
      expectedContactInfoData.phone ||= null;
      expectedContactInfoData.linkedin ||= null;
      expectedContactInfoData.github ||= null;

      delete contactInfoData.username;

      await request(app)
        .put(getUrl(users[idx].username))
        .send(contactInfoData)
        .set('authorization', `Bearer ${authTokens[idx]}`);

      // Act
      const resp = await request(app)
        .get(getUrl(users[idx].username))
        .set('authorization', `Bearer ${authTokens[idx]}`);

      // Assert
      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual({
        contactInfo: expectedContactInfoData,
      });
    }
  );

  test('Returns status code 404 if contact info does not exist.', async () => {
    // Act
    const resp = await request(app)
      .get(getUrl(users[0].username))
      .set('authorization', `Bearer ${authTokens[0]}`);

    // Assert
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).not.toHaveProperty('contactInfo');
  });
});
