const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { isValidDateString } = require('../utils/dates');
const { validateReadingInput, MESSAGES, MAX_READINGS_PER_DAY, SLOT_ORDER } = require('../utils/validation');

const router = express.Router();
router.use(requireAuth);

const SLOT_SORT_SQL = `array_position(ARRAY['${SLOT_ORDER.join("','")}']::varchar[], slot)`;
const COLUMNS = 'id, reading_date AS date, slot, value, created_at, updated_at';

function badRequest(res, errors) {
  return res.status(400).json({ error: Object.values(errors)[0], errors });
}

/**
 * Business rules that need the database: max 4 per day, one reading per slot per day.
 * `excludeId` lets an edit ignore the reading being edited.
 */
async function checkDayRules(userId, { date, slot }, excludeId = null) {
  const { rows } = await pool.query(
    `SELECT id, slot FROM readings
      WHERE user_id = $1 AND reading_date = $2 AND ($3::int IS NULL OR id <> $3)`,
    [userId, date, excludeId],
  );
  if (rows.some((r) => r.slot === slot)) return { slot: MESSAGES.duplicateSlot(slot) };
  if (rows.length >= MAX_READINGS_PER_DAY) return { date: MESSAGES.maxPerDay };
  return null;
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/readings?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=20
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const params = [req.user.id];
    let where = 'user_id = $1';
    if (from && isValidDateString(from)) {
      params.push(from);
      where += ` AND reading_date >= $${params.length}`;
    }
    if (to && isValidDateString(to)) {
      params.push(to);
      where += ` AND reading_date <= $${params.length}`;
    }

    const total = Number((await pool.query(`SELECT COUNT(*) FROM readings WHERE ${where}`, params)).rows[0].count);
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM readings WHERE ${where}
        ORDER BY reading_date DESC, ${SLOT_SORT_SQL} ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );

    res.json({ data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validateReadingInput(req.body);
    if (Object.keys(errors).length) return badRequest(res, errors);

    const ruleErrors = await checkDayRules(req.user.id, data);
    if (ruleErrors) return badRequest(res, ruleErrors);

    const { rows } = await pool.query(
      `INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [req.user.id, data.date, data.slot, data.value],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Reading not found.' });

    const existing = await pool.query('SELECT id FROM readings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Reading not found.' });

    const { errors, data } = validateReadingInput(req.body);
    if (Object.keys(errors).length) return badRequest(res, errors);

    const ruleErrors = await checkDayRules(req.user.id, data, id);
    if (ruleErrors) return badRequest(res, ruleErrors);

    const { rows } = await pool.query(
      `UPDATE readings SET reading_date = $1, slot = $2, value = $3, updated_at = NOW()
        WHERE id = $4 AND user_id = $5 RETURNING ${COLUMNS}`,
      [data.date, data.slot, data.value, id, req.user.id],
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const result = id
      ? await pool.query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [id, req.user.id])
      : { rowCount: 0 };
    if (!result.rowCount) return res.status(404).json({ error: 'Reading not found.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.SLOT_SORT_SQL = SLOT_SORT_SQL;
