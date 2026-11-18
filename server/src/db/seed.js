// Creates (or resets) a demo user with ~2 months of sample readings.
const bcrypt = require('bcryptjs');
const pool = require('./pool');
const migrate = require('./migrate');
const { todayString } = require('../utils/dates');
const { SLOT_ORDER } = require('../utils/validation');

const DEMO = { name: 'Demo Patient', email: 'demo@sweety.app', password: 'demo1234' };
const BASE = { MORNING_FASTING: 105, AFTER_BREAKFAST: 150, AFTER_LUNCH: 165, AFTER_DINNER: 155 };

// Small deterministic pseudo-random generator so the seed is repeatable.
let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);

function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  await migrate();
  await pool.query('DELETE FROM users WHERE email = $1', [DEMO.email]);
  const hash = await bcrypt.hash(DEMO.password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [DEMO.name, DEMO.email, hash],
  );
  const userId = rows[0].id;

  const today = todayString();
  let count = 0;
  for (let i = 60; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    for (const slot of SLOT_ORDER) {
      if (rand() < 0.15) continue; // skip some readings so not every day is full
      const value = Math.round(BASE[slot] + (rand() - 0.5) * 70);
      await pool.query(
        'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
        [userId, date, slot, value],
      );
      count += 1;
    }
  }
  console.log(`Seeded ${DEMO.email} / ${DEMO.password} with ${count} readings.`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
