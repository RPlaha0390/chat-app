// Protects REST routes: reads the Bearer token, verifies it, and
// attaches req.userId for controllers to use. Socket.IO has its own
// handshake middleware in Task 6 that calls the same verifyToken().
const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ status: 401, message: 'Missing token' });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.id;
    next();
  } catch (err) {
    res.status(401).json({ status: 401, message: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
