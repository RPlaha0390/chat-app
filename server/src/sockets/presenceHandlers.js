// Marks a user online on connect / offline on disconnect, and notifies
// everyone in their conversations. Kept separate from message handling
// since presence is triggered by the connection lifecycle, not a
// client-emitted event.
const Conversation = require('../models/Conversation');
const User = require('../models/User');

async function broadcastPresence(io, userId, isOnline) {
  const user = await User.findByIdAndUpdate(
    userId,
    { isOnline, lastSeen: new Date() },
    { new: true }
  );

  // Only the user's conversation partners need to know they came online/offline.
  const conversations = await Conversation.find({ members: userId }, '_id');
  conversations.forEach((c) => {
    io.to(c._id.toString()).emit('presence:update', {
      userId,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    });
  });
}

function registerPresenceHandlers(io, socket) {
  // broadcastPresence is fire-and-forget here (no event handler awaits
  // it) — .catch() so a failed update (e.g. a transient DB hiccup, or
  // the app shutting down while a disconnect is still being handled)
  // surfaces as a logged error instead of an unhandled promise
  // rejection that could crash the process.
  broadcastPresence(io, socket.userId, true).catch((err) => {
    console.error('Failed to broadcast presence (connect):', err.message);
  });

  socket.on('disconnect', () => {
    // No debounce/grace-period timer here to keep the test suite fast
    // and deterministic; a short delay before marking offline (to
    // absorb page refreshes) can be added later if flapping becomes
    // annoying in practice.
    broadcastPresence(io, socket.userId, false).catch((err) => {
      console.error('Failed to broadcast presence (disconnect):', err.message);
    });
  });
}

module.exports = { registerPresenceHandlers };
