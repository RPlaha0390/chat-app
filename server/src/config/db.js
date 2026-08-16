// Wraps the Mongoose connection so index.js (and test setup) can await
// a single call instead of repeating connection options everywhere.
const mongoose = require('mongoose');

async function connectDB(uri) {
  // bufferCommands: false makes Mongoose fail fast on a dropped
  // connection instead of silently queuing queries forever.
  await mongoose.connect(uri, { bufferCommands: false });
}

module.exports = { connectDB };
