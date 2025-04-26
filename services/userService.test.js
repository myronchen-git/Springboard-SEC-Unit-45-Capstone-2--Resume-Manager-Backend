'use strict';

const User = require('../models/user');
const { updateUser } = require('./userService');

const { users } = require('../_testData');

// ==================================================

jest.mock('../models/user');

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
