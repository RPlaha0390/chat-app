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

    // join is membership-checked (and therefore async) server-side, so
    // wait for both confirmations before sending into the room.
    const bothJoined = Promise.all([
      new Promise((resolve) => aliceSocket.on('joined', resolve)),
      new Promise((resolve) => bobSocket.on('joined', resolve)),
    ]);
    aliceSocket.emit('join', { conversationId });
    bobSocket.emit('join', { conversationId });
    await bothJoined;

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

describe('join', () => {
  it('refuses to join a conversation the user is not a member of, and delivers none of its messages', async () => {
    const alice = await registerUser('socket_alice3');
    const bob = await registerUser('socket_bob3');
    const stranger = await registerUser('socket_stranger3');

    const convoRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ memberIds: [bob.id], isGroup: false });
    const conversationId = convoRes.body.conversation._id;

    const aliceSocket = connectSocket(alice.token);
    const strangerSocket = connectSocket(stranger.token);

    await Promise.all([
      new Promise((resolve) => aliceSocket.on('connect', resolve)),
      new Promise((resolve) => strangerSocket.on('connect', resolve)),
    ]);

    const strangerRejected = new Promise((resolve) => strangerSocket.on('message:error', resolve));
    strangerSocket.emit('join', { conversationId });
    const err = await strangerRejected;
    expect(err.message).toMatch(/not a member/i);

    // And having been refused, the stranger receives no traffic from the room.
    let strangerGotMessage = false;
    strangerSocket.on('message:new', () => {
      strangerGotMessage = true;
    });

    const aliceJoined = new Promise((resolve) => aliceSocket.on('joined', resolve));
    aliceSocket.emit('join', { conversationId });
    await aliceJoined;

    const aliceReceived = new Promise((resolve) => aliceSocket.on('message:new', resolve));
    aliceSocket.emit('message:send', { conversationId, text: 'members only' });
    await aliceReceived;

    expect(strangerGotMessage).toBe(false);

    aliceSocket.close();
    strangerSocket.close();
  });
});

describe('typing:start', () => {
  it('relays to the room for a joined member', async () => {
    const alice = await registerUser('socket_alice5');
    const bob = await registerUser('socket_bob5');

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

    const bothJoined = Promise.all([
      new Promise((resolve) => aliceSocket.on('joined', resolve)),
      new Promise((resolve) => bobSocket.on('joined', resolve)),
    ]);
    aliceSocket.emit('join', { conversationId });
    bobSocket.emit('join', { conversationId });
    await bothJoined;

    const bobSaw = new Promise((resolve) => bobSocket.on('typing:update', resolve));
    aliceSocket.emit('typing:start', { conversationId });

    const update = await bobSaw;
    expect(update).toMatchObject({ conversationId, userId: alice.id, isTyping: true });

    aliceSocket.close();
    bobSocket.close();
  });

  it('does not relay for a conversation the socket never joined', async () => {
    const alice = await registerUser('socket_alice6');
    const bob = await registerUser('socket_bob6');
    const stranger = await registerUser('socket_stranger6');

    const convoRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ memberIds: [bob.id], isGroup: false });
    const conversationId = convoRes.body.conversation._id;

    const aliceSocket = connectSocket(alice.token);
    const strangerSocket = connectSocket(stranger.token);
    await Promise.all([
      new Promise((resolve) => aliceSocket.on('connect', resolve)),
      new Promise((resolve) => strangerSocket.on('connect', resolve)),
    ]);

    const aliceJoined = new Promise((resolve) => aliceSocket.on('joined', resolve));
    aliceSocket.emit('join', { conversationId });
    await aliceJoined;

    let aliceSawTyping = false;
    aliceSocket.on('typing:update', () => {
      aliceSawTyping = true;
    });
    strangerSocket.emit('typing:start', { conversationId });

    // Round-trip a message through the room so we know the stranger's
    // (ignored) event has already been processed by the time we assert.
    const aliceGotMessage = new Promise((resolve) => aliceSocket.once('message:new', resolve));
    aliceSocket.emit('message:send', { conversationId, text: 'ping' });
    await aliceGotMessage;

    expect(aliceSawTyping).toBe(false);

    aliceSocket.close();
    strangerSocket.close();
  });
});

describe('leave', () => {
  it('stops delivering the room\'s messages after the client leaves', async () => {
    const alice = await registerUser('socket_alice4');
    const bob = await registerUser('socket_bob4');

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

    const bothJoined = Promise.all([
      new Promise((resolve) => aliceSocket.on('joined', resolve)),
      new Promise((resolve) => bobSocket.on('joined', resolve)),
    ]);
    aliceSocket.emit('join', { conversationId });
    bobSocket.emit('join', { conversationId });
    await bothJoined;

    // Prove the room is live for bob first, so the assertion below can
    // only fail because of `leave` and not because of a setup mistake.
    const bobFirst = new Promise((resolve) => bobSocket.once('message:new', resolve));
    aliceSocket.emit('message:send', { conversationId, text: 'before leave' });
    expect((await bobFirst).text).toBe('before leave');

    let bobGotSecond = false;
    bobSocket.on('message:new', () => {
      bobGotSecond = true;
    });
    // Wait for the server to confirm the leave, so the send below is
    // ordered strictly after it.
    const bobLeft = new Promise((resolve) => bobSocket.once('left', resolve));
    bobSocket.emit('leave', { conversationId });
    await bobLeft;

    const aliceSecond = new Promise((resolve) => aliceSocket.once('message:new', resolve));
    aliceSocket.emit('message:send', { conversationId, text: 'after leave' });
    expect((await aliceSecond).text).toBe('after leave');

    expect(bobGotSecond).toBe(false);

    aliceSocket.close();
    bobSocket.close();
  });
});
