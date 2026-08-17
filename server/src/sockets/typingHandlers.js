// Purely ephemeral — nothing here touches the database, it just relays
// "someone is typing" to the rest of the room.
function registerTypingHandlers(io, socket) {
  socket.on('typing:start', ({ conversationId }) => {
    socket.to(conversationId).emit('typing:update', {
      conversationId,
      userId: socket.userId,
      isTyping: true,
    });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(conversationId).emit('typing:update', {
      conversationId,
      userId: socket.userId,
      isTyping: false,
    });
  });
}

module.exports = { registerTypingHandlers };
