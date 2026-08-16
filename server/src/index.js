// The only file that actually starts anything: loads env vars, connects
// to Mongo, and starts the HTTP server. app.js stays side-effect-free
// so it's testable in isolation.
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(process.env.MONGO_URI);
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
