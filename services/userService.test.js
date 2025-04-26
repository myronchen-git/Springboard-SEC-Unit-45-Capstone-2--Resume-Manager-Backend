'use strict';

const User = require('../models/user');
const ContactInfo = require('../models/contactInfo');
const { updateUser, createUpdateContactInfo } = require('./userService');

const { BadRequestError, NotFoundError } = require('../errors/appErrors');

const { users, contactInfos } = require('../_testData');

// ==================================================

jest.mock('../models/user');
jest.mock('../models/contactInfo');

// ==================================================

const userData = users[0];

// --------------------------------------------------
// updateUser

describe('updateUser', () => {
  const mockUser = { ...userData };
  delete mockUser.password;
  Object.freeze(mockUser);

  beforeEach(() => {
    User.signin.mockReset();
    User.update.mockReset();
  });

  test('Verifies old password if setting new password.', async () => {
    // Arrange
    const username = userData.username;
    const oldPassword = userData.password;
    const newPassword = 'new' + userData.password;
    const props = { oldPassword, newPassword };

    User.update.mockResolvedValue(mockUser);

    // Act
    const user = await updateUser(username, props);

    // Assert
    expect(user).toEqual(mockUser);

    expect(User.signin).toHaveBeenCalledWith({
      username,
      password: oldPassword,
    });

    expect(User.update).toHaveBeenCalledWith(username, {
      password: newPassword,
    });
  });

  // Temporary test until other kinds of props exist.
  test('Does not verify old password if not setting new password.', async () => {
    // Arrange
    const username = userData.username;
    const oldPassword = userData.password;
    const props = { oldPassword };

    User.update.mockResolvedValue(mockUser);

    // Act
    const user = await updateUser(username, props);

    // Assert
    expect(user).toEqual(mockUser);

    expect(User.signin).not.toHaveBeenCalled();

    expect(User.update).toHaveBeenCalledWith(username, {});
  });
});

// --------------------------------------------------
// createUpdateContactInfo

describe('createUpdateContactInfo', () => {
  const contactInfoDatas = Object.freeze(
    contactInfos.map((contactInfo) => {
      const { username, ...data } = contactInfo;
      return Object.freeze(data);
    })
  );

  beforeEach(() => {
    ContactInfo.get.mockReset();
    ContactInfo.add.mockReset();
  });

  test.each([
    // Separating each contact info into its own test case.
    ...contactInfoDatas.map((item, idx) => [
      item,
      contactInfos[idx].username,
      contactInfos[idx],
    ]),
  ])(
    'Creates a new contact info if it does not exist for props = %o.',
    async (props, username, expectedContactInfo) => {
      // Arrange
      ContactInfo.get.mockRejectedValue(new NotFoundError());
      ContactInfo.add.mockResolvedValue(expectedContactInfo);

      // Act
      const [statusCode, contactInfo] = await createUpdateContactInfo(
        username,
        props
      );

      // Assert
      expect(statusCode).toBe(201);
      expect(contactInfo).toBe(expectedContactInfo);

      expect(ContactInfo.get).toHaveBeenCalledWith({ username });
      expect(ContactInfo.add).toHaveBeenCalledWith(expectedContactInfo);
    }
  );

  test.each([
    // Separating each contact info into its own test case.
    ...contactInfoDatas.map((item, idx) => [item, contactInfos[idx].username]),
  ])(
    'Updates an existing contact info for props = %o.',
    async (props, username) => {
      // Arrange
      const mockContactInfo = { update: jest.fn() };

      ContactInfo.get.mockResolvedValue(mockContactInfo);

      // Act
      const [statusCode, contactInfo] = await createUpdateContactInfo(
        username,
        props
      );

      // Assert
      expect(statusCode).toBe(200);
      expect(contactInfo).toBe(mockContactInfo);

      expect(ContactInfo.get).toHaveBeenCalledWith({ username });
      expect(mockContactInfo.update).toHaveBeenCalledWith(props);
      expect(ContactInfo.add).not.toHaveBeenCalled();
    }
  );

  test(
    'Continue throwing Error if it is not NotFoundError ' +
      'when checking for existing contact info.',
    async () => {
      // Arrange
      const username = contactInfos[0].username;
      const props = contactInfoDatas[0];

      ContactInfo.get.mockRejectedValue(new Error());

      // Act
      async function runFunc() {
        await createUpdateContactInfo(username, props);
      }

      // Assert
      await expect(runFunc).rejects.toThrow();

      expect(ContactInfo.get).toHaveBeenCalledWith({ username });
      expect(ContactInfo.add).not.toHaveBeenCalled();
    }
  );

  test(
    'Throws an Error if full name is not provided ' +
      'when creating a new contact info entry.',
    async () => {
      // Arrange
      const username = contactInfos[1].username;
      const { fullName, ...props } = contactInfoDatas[1];

      ContactInfo.get.mockRejectedValue(new NotFoundError());

      // Act
      async function runFunc() {
        await createUpdateContactInfo(username, props);
      }

      // Assert
      await expect(runFunc).rejects.toThrow(BadRequestError);

      expect(ContactInfo.get).toHaveBeenCalledWith({ username });
      expect(ContactInfo.add).not.toHaveBeenCalled();
    }
  );
});
