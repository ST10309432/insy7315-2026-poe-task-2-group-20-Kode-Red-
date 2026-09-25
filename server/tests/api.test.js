// API tests that don't need a database (auth, validation, routing).
process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

afterAll(() => pool.end());

test('unknown routes return 404 JSON', async () => {
  const res = await request(app).get('/api/nope');
  expect(res.status).toBe(404);
  expect(res.body.error.message).toMatch(/not found/);
});

test('protected routes require a token', async () => {
  expect((await request(app).get('/api/orders/mine')).status).toBe(401);
  expect((await request(app).get('/api/wallet')).status).toBe(401);
});

test('invalid tokens are rejected', async () => {
  const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
  expect(res.status).toBe(401);
});

test('login validates input before touching the database', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
  expect(res.status).toBe(400);
  expect(res.body.error.details.map(d => d.field)).toEqual(expect.arrayContaining(['email', 'password']));
});

test('malformed JSON returns 400', async () => {
  const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
  expect(res.status).toBe(400);
});

test('security headers are set', async () => {
  const res = await request(app).get('/api/nope');
  expect(res.headers['x-content-type-options']).toBe('nosniff');
});

test('API docs and OpenAPI spec are served', async () => {
  const spec = await request(app).get('/api/openapi.json');
  expect(spec.status).toBe(200);
  expect(spec.body.openapi).toBe('3.1.0');
  expect(Object.keys(spec.body.paths).length).toBeGreaterThan(25);
  expect((await request(app).get('/api/docs/')).status).toBe(200);
});

test('photo upload requires admin login', async () => {
  const res = await request(app).put('/api/menu/1/image').set('Content-Type', 'image/jpeg').send(Buffer.from([0xff, 0xd8, 0xff]));
  expect(res.status).toBe(401);
});
