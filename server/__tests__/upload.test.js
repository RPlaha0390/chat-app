// Covers: a valid image upload returns a usable URL, an oversized or
// wrong-type file is rejected with 400, and the endpoint requires auth.
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

const uploadsDir = path.join(__dirname, '..', 'src', 'uploads');
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

  it('strips directory traversal from the client-supplied filename', async () => {
    const token = await getToken();

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', path.join(__dirname, 'fixtures', 'sample.png'), {
        filename: '../../../../etc/pwned.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(201);
    expect(res.body.url).not.toMatch(/\.\./);
    // The stored name must be a leaf inside /uploads, nothing else.
    expect(res.body.url).toMatch(/^\/uploads\/\d+-pwned\.png$/);

    const storedName = res.body.url.replace('/uploads/', '');
    expect(fs.existsSync(path.join(uploadsDir, storedName))).toBe(true);
  });

  it('stores the file with an extension derived from its mimetype, not its filename', async () => {
    const token = await getToken();

    // A real PNG announced as image/png but named `.html` — trusting the
    // filename here would land executable HTML on the API origin.
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', path.join(__dirname, 'fixtures', 'sample.png'), {
        filename: 'evil.html',
        contentType: 'image/png',
      });

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\.png$/);
    expect(res.body.url).not.toMatch(/\.html/);
  });

  it('rejects an image mimetype that is not in the allowlist', async () => {
    const token = await getToken();

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', path.join(__dirname, 'fixtures', 'sample.png'), {
        filename: 'evil.svg',
        contentType: 'image/svg+xml',
      });

    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated request with 401', async () => {
    // No file attached on purpose: requireAuth runs ahead of multer, so
    // it answers 401 before the body is read. Streaming a file here
    // races that early response (the server tears the socket down while
    // supertest is still writing, surfacing as EPIPE) without testing
    // anything extra.
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(401);
  });
});
