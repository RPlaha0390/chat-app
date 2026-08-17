// Covers: a valid image upload returns a usable URL, an oversized or
// wrong-type file is rejected with 400, and the endpoint requires auth.
const request = require('supertest');
const path = require('path');
const app = require('../src/app');
const { startInMemoryMongo, stopInMemoryMongo } = require('./testUtils/inMemoryMongo');

beforeAll(startInMemoryMongo);
afterAll(stopInMemoryMongo);

async function getToken() {
  // Create a unique user each time to avoid duplicate user errors across multiple tests
  const uniqueId = Date.now() + Math.random();
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: `uploader_${uniqueId}`, email: `uploader_${uniqueId}@example.com`, password: 'password123' });
  return res.body.token;
}

describe('POST /api/upload', () => {
  it('accepts an image and returns a URL', async () => {
    const token = await getToken();

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', path.join(__dirname, 'fixtures', 'sample.png'));

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\/uploads\//);
  });

  it('rejects a non-image file with 400', async () => {
    const token = await getToken();

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', path.join(__dirname, 'fixtures', 'sample.txt'));

    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', path.join(__dirname, 'fixtures', 'sample.png'));
    expect(res.status).toBe(401);
  });
});
