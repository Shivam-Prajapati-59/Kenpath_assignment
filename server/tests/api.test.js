// Integration tests against a real PostgreSQL test database (TEST_DATABASE_URL).
process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const migrate = require('../src/db/migrate');
const { todayString } = require('../src/utils/dates');

const today = todayString();

async function registerAndLogin(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'secret123' });
  return res.body.token;
}

function addReading(token, body) {
  return request(app).post('/api/readings').set('Authorization', `Bearer ${token}`).send(body);
}

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  await pool.query('TRUNCATE readings, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('auth', () => {
  test('registers, hashes the password and logs in', async () => {
    await registerAndLogin('a@test.com');
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', ['a@test.com']);
    expect(rows[0].password_hash).not.toBe('secret123');
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);

    const login = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'secret123' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
  });

  test('rejects a wrong password', async () => {
    await registerAndLogin('a@test.com');
    const res = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'nope' });
    expect(res.status).toBe(401);
  });

  test('rejects duplicate emails', async () => {
    await registerAndLogin('a@test.com');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'A@test.com', password: 'secret123' });
    expect(res.status).toBe(409);
  });

  test('readings require a token', async () => {
    expect((await request(app).get('/api/readings')).status).toBe(401);
  });
});

describe('readings', () => {
  let token;
  beforeEach(async () => {
    token = await registerAndLogin('p@test.com');
  });

  test('creates, edits and deletes a reading', async () => {
    const created = await addReading(token, { date: today, slot: 'MORNING_FASTING', value: 110 });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .put(`/api/readings/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: today, slot: 'MORNING_FASTING', value: 130 });
    expect(updated.status).toBe(200);
    expect(updated.body.value).toBe(130);

    const del = await request(app).delete(`/api/readings/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  test('rejects a missing value with the right message', async () => {
    const res = await addReading(token, { date: today, slot: 'AFTER_LUNCH', value: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please enter a glucose value.');
  });

  test('rejects a second reading in the same slot', async () => {
    await addReading(token, { date: today, slot: 'AFTER_LUNCH', value: 140 });
    const res = await addReading(token, { date: today, slot: 'AFTER_LUNCH', value: 150 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You already have an After lunch reading for this date.');
  });

  test('editing a reading into an occupied slot is rejected', async () => {
    await addReading(token, { date: today, slot: 'AFTER_LUNCH', value: 140 });
    const other = await addReading(token, { date: today, slot: 'AFTER_DINNER', value: 150 });
    const res = await request(app)
      .put(`/api/readings/${other.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: today, slot: 'AFTER_LUNCH', value: 150 });
    expect(res.status).toBe(400);
  });

  test('rejects future dates', async () => {
    const res = await addReading(token, { date: '2999-01-01', slot: 'AFTER_LUNCH', value: 140 });
    expect(res.body.error).toBe('Date cannot be in the future.');
  });

  test('users only see their own readings', async () => {
    const created = await addReading(token, { date: today, slot: 'AFTER_LUNCH', value: 140 });
    const otherToken = await registerAndLogin('other@test.com');

    const list = await request(app).get('/api/readings').set('Authorization', `Bearer ${otherToken}`);
    expect(list.body.data).toHaveLength(0);

    const del = await request(app).delete(`/api/readings/${created.body.id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(del.status).toBe(404);
  });

  test('paginates the list', async () => {
    for (const slot of ['MORNING_FASTING', 'AFTER_BREAKFAST', 'AFTER_LUNCH']) {
      await addReading(token, { date: today, slot, value: 100 });
    }
    const res = await request(app).get('/api/readings?page=2&limit=2').set('Authorization', `Bearer ${token}`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });
});

describe('reports', () => {
  test('daily report returns highest, lowest, average and count', async () => {
    const token = await registerAndLogin('r@test.com');
    await addReading(token, { date: today, slot: 'MORNING_FASTING', value: 100 });
    await addReading(token, { date: today, slot: 'AFTER_LUNCH', value: 151 });
    await addReading(token, { date: today, slot: 'AFTER_DINNER', value: 130 });

    const res = await request(app).get(`/api/reports/daily?date=${today}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ count: 3, highest: 151, lowest: 100, average: 127 });
    expect(res.body.readings.map((r) => r.slot)).toEqual(['MORNING_FASTING', 'AFTER_LUNCH', 'AFTER_DINNER']);
  });

  test('average is rounded to 1 decimal', async () => {
    const token = await registerAndLogin('r2@test.com');
    await addReading(token, { date: today, slot: 'MORNING_FASTING', value: 100 });
    await addReading(token, { date: today, slot: 'AFTER_LUNCH', value: 101 });
    await addReading(token, { date: today, slot: 'AFTER_DINNER', value: 101 });
    const res = await request(app).get(`/api/reports/mtd?date=${today}`).set('Authorization', `Bearer ${token}`);
    expect(res.body.average).toBe(100.7);
  });

  test('empty report returns count 0', async () => {
    const token = await registerAndLogin('r3@test.com');
    const res = await request(app).get(`/api/reports/monthly?date=${today}`).set('Authorization', `Bearer ${token}`);
    expect(res.body).toMatchObject({ count: 0, highest: null, lowest: null, average: null });
  });
});
