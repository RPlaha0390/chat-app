// Handles register/login/me. Passwords are hashed with bcrypt before
// ever touching the database — the User model only ever sees/stores
// passwordHash, never the plaintext password.
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { asyncHandler } = require('../utils/asyncHandler');

// Strips fields we never want to send to the client, even on our own user.
function toPublicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    // Thrown errors reach errorHandler via asyncHandler's catch.
    const err = new Error('Email already registered');
    err.status = 400;
    throw err;
  }

  // 10 salt rounds is bcrypt's commonly recommended default — enough
  // work to resist brute-forcing without meaningfully slowing login.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash });

  const token = signToken(user._id.toString());
  res.status(201).json({ user: toPublicUser(user), token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    // Same message for "no such user" and "wrong password" so we don't
    // leak which emails are registered.
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const token = signToken(user._id.toString());
  res.json({ user: toPublicUser(user), token });
});

const me = asyncHandler(async (req, res) => {
  // req.userId was set by the requireAuth middleware.
  const user = await User.findById(req.userId);
  res.json({ user: toPublicUser(user) });
});

module.exports = { register, login, me };
