const request = require('supertest');
const app = require('../app');

describe('Static file serving', () => {
  it('should serve index.html at root path', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Webpage');
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
