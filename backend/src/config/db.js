import dotenv from 'dotenv';
import path from 'path';


dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import pkg from 'pg';
const { Pool } = pkg;

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const k of required) {
  if (!process.env[k]) {
    throw new Error(`Missing required env var: ${k}. Check your .env file location/values.`);
  }
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export default pool;
