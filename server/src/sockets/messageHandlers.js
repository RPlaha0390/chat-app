// Reuses createMessage/assertMembership from the REST controller
// (Task 4) so a socket-sent message is persisted through the exact
// same path as a REST-sent one — no duplicated logic to drift.
const { createMessage, assertMembership } = require('../controllers/conversationController');

function registerMessageHandlers(io, socket) {
  socket.on('join', ({ conversationId }) => {
    socket.join(conversationId);
  });

  socket.on('message:send', async ({ conversationId, text, attachmentUrl }) => {
    try {
      await assertMembership(conversationId, socket.userId);

      const message = await createMessage({
        conversationId,
        senderId: socket.userId,
        text,
        attachment: attachmentUrl ? { url: attachmentUrl } : undefined,
      });

      // Broadcast to the whole room, including the sender, so every
      // client's UI updates from this single event — the sender never
      // renders an optimistic local copy that could drift from what
      // was actually persisted.
      io.to(conversationId).emit('message:new', message);
    } catch (err) {
      // A rejected send shouldn't crash the socket connection — just
      // tell that one client it failed.
      socket.emit('message:error', { message: err.message });
    }
  });
}

module.exports = { registerMessageHandlers };
