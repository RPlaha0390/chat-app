// Reuses createMessage/assertMembership from the REST controller
// (Task 4) so a socket-sent message is persisted through the exact
// same path as a REST-sent one — no duplicated logic to drift.
const { createMessage, assertMembership } = require('../controllers/conversationController');

function registerMessageHandlers(io, socket) {
  // Joining a room is a *read* grant: everything broadcast to that room
  // (message:new, typing:update) flows to whoever is in it. So it needs
  // the same membership check message:send already performs — otherwise
  // any authenticated user could subscribe to any conversation by id.
  socket.on('join', async ({ conversationId }) => {
    try {
      await assertMembership(conversationId, socket.userId);
      socket.join(conversationId);
      // Lets a caller know the (now asynchronous) join actually took
      // effect before it starts sending into the room.
      socket.emit('joined', { conversationId });
    } catch (err) {
      socket.emit('message:error', { message: err.message });
    }
  });

  // Leaving needs no membership check — dropping a subscription can only
  // ever reduce what this socket receives. The client calls this when
  // switching conversations so rooms don't accumulate (which would leak
  // one conversation's typing/message events into another's view).
  socket.on('leave', ({ conversationId }) => {
    socket.leave(conversationId);
    socket.emit('left', { conversationId });
  });

  socket.on('message:send', async ({ conversationId, text, attachmentUrl }) => {
    try {
      await assertMembership(conversationId, socket.userId);

      // Membership is confirmed, so joining here is safe and idempotent.
      // It also closes a race: `join` is now asynchronous, and a client
      // that sends immediately after selecting a conversation could
      // otherwise miss the broadcast of its own message.
      socket.join(conversationId);

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
