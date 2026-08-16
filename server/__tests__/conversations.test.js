// Covers: creating a DM, creating a group, listing "my conversations",
// and paginated message history. Uses a small helper to register two
// users and grab their tokens, since every test here needs an
// authenticated actor.
const request = require('supertest');
const app = require('../src/app');
const { startInMemoryMongo, stopInMemoryMongo } = require('./testUtils/inMemoryMongo');

beforeAll(startInMemoryMongo);
afterAll(stopInMemoryMongo);

async function registerUser(username) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, email: `${username}@example.com`, password: 'password123' });
  return { token: res.body.token, id: res.body.user.id };
}

describe('POST /api/conversations', () => {
  it('creates a DM between two users', async () => {
    const alice = await registerUser('alice_c');
    const bob = await registerUser('bob_c');

    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ memberIds: [bob.id], isGroup: false });

    expect(res.status).toBe(201);
    expect(res.body.conversation.members).toHaveLength(2);
    expect(res.body.conversation.isGroup).toBe(false);
  });

  it('creates a named group with 3+ members', async () => {
    const alice = await registerUser('alice_g');
    const bob = await registerUser('bob_g');
    const carol = await registerUser('carol_g');

    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ memberIds: [bob.id, carol.id], isGroup: true, name: 'Study Group' });

    expect(res.status).toBe(201);
    expect(res.body.conversation.name).toBe('Study Group');
    expect(res.body.conversation.members).toHaveLength(3); // includes creator
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/conversations').send({ memberIds: [], isGroup: false });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/conversations', () => {
  it("lists only the current user's conversations", async () => {
    const alice = await registerUser('alice_l');
    const bob = await registerUser('bob_l');
    const stranger = await registerUser('stranger_l');

    await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ memberIds: [bob.id], isGroup: false });

    const aliceList = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`);
    const strangerList = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(aliceList.body.conversations).toHaveLength(1);
    expect(strangerList.body.conversations).toHaveLength(0);
  });
});

describe('GET /api/conversations/:id/messages', () => {
  it('returns paginated message history, newest page first', async () => {
    const alice = await registerUser('alice_m');
    const bob = await registerUser('bob_m');

    const convoRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ memberIds: [bob.id], isGroup: false });
    const conversationId = convoRes.body.conversation._id;

    // Send first message and verify sender is populated (critical for Socket.IO broadcast and frontend).
    const firstMessageRes = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ text: 'first' });

    expect(firstMessageRes.body.message.sender.username).toBe('alice_m');
    expect(firstMessageRes.body.message.sender.avatarUrl).toBeDefined();

    // Send remaining messages so we have something to paginate.
    for (const text of ['second', 'third']) {
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ text });
    }

    const res = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(3);
    expect(res.body.messages[0].text).toBe('third'); // newest first
    // Verify sender is populated in history fetch too (same populate path as sendMessage).
    expect(res.body.messages[0].sender.username).toBe('alice_m');
  });

  it('rejects a non-member from reading history with 403', async () => {
    const alice = await registerUser('alice_m2');
    const bob = await registerUser('bob_m2');
    const stranger = await registerUser('stranger_m2');

    const convoRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ memberIds: [bob.id], isGroup: false });

    const res = await request(app)
      .get(`/api/conversations/${convoRes.body.conversation._id}/messages`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/users', () => {
  it('lists other registered users, excluding the current user', async () => {
    const alice = await registerUser('alice_u');
    const bob = await registerUser('bob_u');

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    const ids = res.body.users.map((u) => u.id);
    expect(ids).toContain(bob.id);
    expect(ids).not.toContain(alice.id);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});
