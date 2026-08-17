// Integration test against a *real* running server (Socket.IO needs an
// actual open port — Supertest's in-process approach doesn't apply
// here). Covers: a bad/missing token is rejected at handshake, and a
// sent message is broadcast to everyone in the conversation room
// including the sender.
const http = require('http');
const { io: ioClient } = require('socket.io-client');
const { Server } = require('socket.io');
const request = require('supertest');
const app = require('../src/app');
const { registerSocketHandlers } = require('../src/sockets');
const { startInMemoryMongo, stopInMemoryMongo } = require('./testUtils/inMemoryMongo');

let httpServer, io, baseUrl;

beforeAll(async () => {
  await startInMemoryMongo();

  httpServer = http.createServer(app);
  io = new Server(httpServer);
  registerSocketHandlers(io);

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address();
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  io.close();
  httpServer.close();
  await stopInMemoryMongo();
});

async function registerUser(username) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, email: `${username}@example.com`, password: 'password123' });
  return { token: res.body.token, id: res.body.user.id };
}

function connectSocket(token) {
  return ioClient(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true });
}

describe('Socket.IO connection auth', () => {
  it('rejects a connection with no token', (done) => {
    const socket = connectSocket(undefined);
    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/auth/i);
      socket.close();
      done();
    });
  });

  it('accepts a connection with a valid token', (done) => {
    registerUser('socket_alice').then(({ token }) => {
      const socket = connectSocket(token);
      socket.on('connect', () => {
        socket.close();
        done();
      });
    });
  });
});

describe('message:send', () => {
  it('broadcasts message:new to everyone in the conversation room, including the sender', async () => {
    const alice = await registerUser('socket_alice2');
    const bob = await registerUser('socket_bob2');

    const convoRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ memberIds: [bob.id], isGroup: false });
    const conversationId = convoRes.body.conversation._id;

    const aliceSocket = connectSocket(alice.token);
    const bobSocket = connectSocket(bob.token);

    await Promise.all([
      new Promise((resolve) => aliceSocket.on('connect', resolve)),
      new Promise((resolve) => bobSocket.on('connect', resolve)),
    ]);

    aliceSocket.emit('join', { conversationId });
    bobSocket.emit('join', { conversationId });

    const bobReceived = new Promise((resolve) => bobSocket.on('message:new', resolve));
    const aliceReceived = new Promise((resolve) => aliceSocket.on('message:new', resolve));

    aliceSocket.emit('message:send', { conversationId, text: 'hi bob' });

    const [bobMsg, aliceMsg] = await Promise.all([bobReceived, aliceReceived]);
    expect(bobMsg.text).toBe('hi bob');
    expect(aliceMsg.text).toBe('hi bob'); // sender also gets it, per the spec's data flow

    aliceSocket.close();
    bobSocket.close();
  });
});
