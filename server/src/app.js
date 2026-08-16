// Builds the Express app WITHOUT starting it or connecting to Mongo.
// Keeping this separate from index.js lets tests `require('../src/app')`
// and hit routes with Supertest against an in-memory Mongo instance,
// with no real network port involved.
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// Simple liveness check — also doubles as our first test target to
// prove the scaffolding (app, error handler, test runner) all wire up.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/authRoutes'));

// Must be registered last — Express only treats a 4-arg function as
// error-handling middleware.
app.use(errorHandler);

module.exports = app;
