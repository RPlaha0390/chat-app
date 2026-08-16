// A DM is just a 2-member Conversation with isGroup: false — no
// separate DM model, so "list my conversations" is always one query.
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, default: null }, // only meaningful when isGroup
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    // Denormalized pointer to the latest message so the conversation
    // list can show a preview without a separate query per conversation.
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

// Speeds up "find all conversations this user belongs to".
conversationSchema.index({ members: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
