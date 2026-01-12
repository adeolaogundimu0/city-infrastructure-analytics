import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
  const p = path.join(__dirname, 'indexes.sql');
  const sql = fs.readFileSync(p, 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ Indexes applied successfully.');
  } catch (err) {
    console.error('❌ Failed to apply indexes:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
