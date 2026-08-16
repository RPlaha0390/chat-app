// Feeds the "start a new conversation" picker (Task 9's
// NewConversationModal): the client needs some list of users to choose
// from before it can call POST /api/conversations.
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.userId } }, 'username avatarUrl');

  res.json({
    users: users.map((u) => ({ id: u._id, username: u.username, avatarUrl: u.avatarUrl })),
  });
});

module.exports = { listUsers };
