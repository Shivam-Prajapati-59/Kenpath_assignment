const { Pool, types } = require('pg');
const config = require('../config');

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date objects,
// so dates are never shifted by the server's timezone.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({ connectionString: config.databaseUrl });

module.exports = pool;
