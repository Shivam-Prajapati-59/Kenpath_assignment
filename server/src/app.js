const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const readingRoutes = require('./routes/readings');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }
  // Unique (user, date, slot) violation from a race between two requests.
  if (err.code === '23505' && err.constraint === 'readings_user_date_slot_unique') {
    return res.status(400).json({ error: 'You already have a reading for this slot on this date.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
