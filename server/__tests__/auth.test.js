// Covers the three auth endpoints plus the requireAuth middleware's
// rejection path, since every other protected route depends on it.
const request = require('supertest');
const app = require('../src/app');
const { startInMemoryMongo, stopInMemoryMongo } = require('./testUtils/inMemoryMongo');

beforeAll(startInMemoryMongo);
afterAll(stopInMemoryMongo);

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.passwordHash).toBeUndefined(); // never leak the hash
  });

  it('rejects a duplicate email with 400', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'dupe@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob2', email: 'dupe@example.com', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate username with 400, not a 500 from the unique index', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupename', email: 'dupename1@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupename', email: 'dupename2@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already taken/i);
  });

  it('rejects a registration missing required fields with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nousername@example.com', password: 'password123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'carol', email: 'carol@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dave', email: 'dave@example.com', password: 'password123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${register.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('dave@example.com');
  });

  it('rejects a missing token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
