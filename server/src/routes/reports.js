const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { getReportRange, isValidDateString, todayString } = require('../utils/dates');
const { SLOT_SORT_SQL } = require('./readings');

const router = express.Router();
router.use(requireAuth);

const REPORT_TYPES = ['daily', 'mtd', 'monthly'];

// GET /api/reports/:type?date=YYYY-MM-DD   (type = daily | mtd | monthly)
router.get('/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    if (!REPORT_TYPES.includes(type)) {
      return res.status(404).json({ error: 'Unknown report type.' });
    }
    const date = req.query.date || todayString();
    if (!isValidDateString(date)) {
      return res.status(400).json({ error: 'Please select a valid date.' });
    }

    const { from, to } = getReportRange(type, date);
    const params = [req.user.id, from, to];
    const where = 'user_id = $1 AND reading_date BETWEEN $2 AND $3';

    const stats = (
      await pool.query(
        `SELECT COUNT(*)::int AS count, MAX(value) AS highest, MIN(value) AS lowest,
                ROUND(AVG(value)::numeric, 1)::float AS average
           FROM readings WHERE ${where}`,
        params,
      )
    ).rows[0];

    // Daily report lists each reading; month reports include per-reading points for the chart.
    const { rows: readings } = await pool.query(
      `SELECT id, reading_date AS date, slot, value FROM readings WHERE ${where}
        ORDER BY reading_date ASC, ${SLOT_SORT_SQL} ASC`,
      params,
    );

    return res.json({ type, from, to, ...stats, readings });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
