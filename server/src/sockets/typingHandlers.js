// Purely ephemeral — nothing here touches the database, it just relays
// "someone is typing" to the rest of the room.
//
// Membership is enforced by only relaying for rooms this socket has
// actually joined: `join` is membership-checked (see messageHandlers),
// so being in the room is proof of membership. That keeps a non-member
// from pushing typing indicators into a conversation they can't read,
// without a database round trip on every keystroke.
function isInRoom(socket, conversationId) {
  return Boolean(conversationId) && socket.rooms.has(conversationId);
}

function registerTypingHandlers(io, socket) {
  socket.on('typing:start', ({ conversationId }) => {
    if (!isInRoom(socket, conversationId)) return;
    socket.to(conversationId).emit('typing:update', {
      conversationId,
      userId: socket.userId,
      isTyping: true,
    });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    if (!isInRoom(socket, conversationId)) return;
    socket.to(conversationId).emit('typing:update', {
      conversationId,
      userId: socket.userId,
      isTyping: false,
    });
  });
}

module.exports = { registerTypingHandlers };
