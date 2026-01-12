import pool from './db.js';

const test = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Connected to DB at:', res.rows[0].now);
    process.exit(0);
  } catch (err) {
    console.error('DB connection failed:', err);
    process.exit(1);
  }
};

test();
