// Represents a registered account. passwordHash is set by the auth
// controller (Task 3) — this schema never handles hashing itself, it
// just stores the result.
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true } // adds createdAt/updatedAt automatically
);

module.exports = mongoose.model('User', userSchema);
