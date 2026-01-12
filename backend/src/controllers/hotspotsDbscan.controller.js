import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SQL_PATH = path.join(__dirname, '../sql/hotspot_dbscan.sql');
const DBSCAN_SQL = fs.readFileSync(SQL_PATH, 'utf8');

function parseNullableDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseIntWithDefault(v, def) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function parseFloatWithDefault(v, def) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

// GET /api/hotspots/dbscan?from=...&to=...&type=...&eps=200&minPoints=10
export async function getHotspotsDbscan(req, res) {
  try {
    const from = parseNullableDate(req.query.from);
    const to = parseNullableDate(req.query.to);
    const type = req.query.type ? String(req.query.type) : null;

    const eps = parseFloatWithDefault(req.query.eps, 200); // meters
    const minPoints = parseIntWithDefault(req.query.minPoints, 10);

    const safeEps = Math.max(25, Math.min(eps, 2000));
    const safeMinPoints = Math.max(3, Math.min(minPoints, 200));

    const result = await pool.query(DBSCAN_SQL, [
      from,
      to,
      type,
      safeEps,
      safeMinPoints,
    ]);

    res.json({
      filters: { from, to, type, eps: safeEps, minPoints: safeMinPoints },
      rows: result.rows,
    });
  } catch (err) {
    console.error('getHotspotsDbscan failed:', err);
    res.status(500).json({ error: 'Failed to compute DBSCAN hotspots' });
  }
}
