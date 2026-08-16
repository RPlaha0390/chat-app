// Shared helper so every test file gets an isolated, real MongoDB
// (in-memory, no Docker/local Mongo needed) instead of hitting a real
// database or hand-rolling mocks that could drift from real Mongoose
// behavior.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

async function startInMemoryMongo() {
  mongod = await MongoMemoryServer.create();
  // Force Mongoose to create indexes for unique constraints to be enforced
  await mongoose.connect(mongod.getUri(), {
    serverSelectionTimeoutMS: 5000,
  });
  // Ensure all indexes are created (needed for unique constraints to work)
  await mongoose.connection.syncIndexes();
}

async function stopInMemoryMongo() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

module.exports = { startInMemoryMongo, stopInMemoryMongo };
