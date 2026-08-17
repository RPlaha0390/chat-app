// Entry point: authenticates each connecting socket (mirrors
// requireAuth's logic, using the same verifyToken helper) then wires
// up the three handler groups. index.js (the app entrypoint) only
// needs to call registerSocketHandlers(io) — it doesn't need to know
// about auth, messages, typing, or presence individually.
const { verifyToken } = require('../utils/jwt');
const { registerMessageHandlers } = require('./messageHandlers');
const { registerTypingHandlers } = require('./typingHandlers');
const { registerPresenceHandlers } = require('./presenceHandlers');

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const { token } = socket.handshake.auth || {};
    if (!token) return next(new Error('Authentication error: missing token'));

    try {
      const payload = verifyToken(token);
      socket.userId = payload.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerPresenceHandlers(io, socket);
  });
}

module.exports = { registerSocketHandlers };
