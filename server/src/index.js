// Now creates an explicit http.Server so Socket.IO can attach to the
// same server/port as Express, per the spec's "shared port" decision.
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
const { registerSocketHandlers } = require('./sockets');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(process.env.MONGO_URI);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN, credentials: true },
  });
  registerSocketHandlers(io);

  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
