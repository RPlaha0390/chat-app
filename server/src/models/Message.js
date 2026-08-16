const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    attachment: {
      url: { type: String },
      type: { type: String }, // e.g. "image/png"
    },
    // Present now (even with no UI yet) so read receipts can be added
    // later without a schema migration — see design spec's Non-Goals.
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Speeds up paginated "load message history for this conversation,
// newest first" — the exact query shape Task 4's history endpoint uses.
messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
