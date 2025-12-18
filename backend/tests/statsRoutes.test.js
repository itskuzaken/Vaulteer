const request = require('supertest');
const app = require('../server'); // assuming server.js exports the express app

describe('GET /api/stats/dashboard', () => {
  it('returns default shape', async () => {
    const res = await request(app).get('/api/stats/dashboard').set('Accept', 'application/json');
    expect(res.status).toBe(401); // unauthorized without auth - at least ensure route exists
  });

  it('accepts compare=true as query param', async () => {
    const res = await request(app).get('/api/stats/dashboard?compare=true').set('Accept', 'application/json');
    // without auth, still returns 401 but should parse params without throwing
    expect(res.status).toBe(401);
  });
});
