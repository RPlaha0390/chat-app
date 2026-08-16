// Proves the scaffolding works end to end: Express app boots, Supertest
// can hit it, and a route returns JSON. Every later test file follows
// this same require('../src/app') + supertest(app) pattern.
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns 200 and status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
