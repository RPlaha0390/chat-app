// Single place that knows how tokens are signed/verified, so both the
// REST requireAuth middleware (this task) and the Socket.IO handshake
// middleware (Task 6) use identical logic instead of two copies that
// could drift apart.
const jwt = require('jsonwebtoken');

function signToken(userId) {
  // 7 days: long enough that a user isn't logged out every session,
  // short enough to bound the damage if a token leaks.
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  // Throws if invalid/expired — callers decide how to translate that
  // into an HTTP 401 or a rejected socket connection.
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
