// Handles conversation creation/listing and message send/history.
// createMessage is exported standalone (not just used inside
// sendMessage) so Task 6's Socket.IO handler can call the exact same
// persistence logic instead of duplicating it, per the spec.
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');

const PAGE_SIZE = 30;

const createConversation = asyncHandler(async (req, res) => {
  const { memberIds, isGroup, name } = req.body;

  if (!Array.isArray(memberIds)) {
    const err = new Error('memberIds must be an array of user ids');
    err.status = 400;
    throw err;
  }

  // Don't take the client's word that these ids are real accounts —
  // without this, a conversation can be created containing arbitrary
  // ObjectIds that never resolve to a user when members are populated.
  // (A malformed id throws a CastError here, which errorHandler maps
  // to a 400 too.)
  const requestedIds = Array.from(new Set(memberIds.map(String)));
  const existingCount = await User.countDocuments({ _id: { $in: requestedIds } });
  if (existingCount !== requestedIds.length) {
    const err = new Error('One or more members do not exist');
    err.status = 400;
    throw err;
  }

  // The creator is always a member, even if the client forgot to include them.
  const members = Array.from(new Set([req.userId, ...requestedIds]));

  // A DM is identified by its pair of members, not by an id the client
  // holds — so picking the same person twice must land back in the same
  // conversation rather than forking history into a second one.
  if (!isGroup && members.length === 2) {
    const existing = await Conversation.findOne({
      isGroup: false,
      members: { $all: members, $size: 2 },
    });
    if (existing) {
      return res.status(200).json({ conversation: existing });
    }
  }

  const conversation = await Conversation.create({
    isGroup: !!isGroup,
    name: isGroup ? name : null,
    members,
  });

  res.status(201).json({ conversation });
});

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ members: req.userId })
    .populate('lastMessage')
    .populate('members', 'username avatarUrl isOnline lastSeen')
    .sort({ updatedAt: -1 });

  res.json({ conversations });
});

// Shared by the REST handler below and Task 6's socket "message:send"
// handler — the single place a Message actually gets created and the
// parent Conversation's lastMessage pointer gets updated.
async function createMessage({ conversationId, senderId, text, attachment }) {
  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    text: text || '',
    attachment: attachment || undefined,
  });

  await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });

  // Populate sender before returning: both the REST response and the
  // Socket.IO broadcast need message.sender.username/avatarUrl directly
  // (MessageList renders these without a second lookup) rather than a
  // bare ObjectId.
  await message.populate('sender', 'username avatarUrl');

  return message;
}

// Throws a 403-tagged error unless userId is a member of conversationId.
// Both the message-send and history routes need this same check, so it
// lives here instead of being copy-pasted into each handler.
async function assertMembership(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.members.some((m) => m.toString() === userId)) {
    const err = new Error('Not a member of this conversation');
    err.status = 403;
    throw err;
  }
}

const sendMessage = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { text, attachment } = req.body;

  await assertMembership(conversationId, req.userId);

  const message = await createMessage({ conversationId, senderId: req.userId, text, attachment });
  res.status(201).json({ message });
});

const getMessages = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { before } = req.query;

  await assertMembership(conversationId, req.userId);

  const query = { conversation: conversationId };
  if (before) {
    // Cursor-based pagination: only fetch messages older than the
    // given message id's createdAt, avoiding skip()'s poor performance
    // on large collections.
    const cursor = await Message.findById(before);
    if (cursor) query.createdAt = { $lt: cursor.createdAt };
  }

  // Populated the same way as createMessage's return value, so
  // MessageList renders identically whether a message arrived via
  // history fetch or a live socket broadcast.
  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(PAGE_SIZE)
    .populate('sender', 'username avatarUrl');
  res.json({ messages });
});

module.exports = {
  createConversation,
  listConversations,
  sendMessage,
  getMessages,
  createMessage,
  assertMembership,
};
