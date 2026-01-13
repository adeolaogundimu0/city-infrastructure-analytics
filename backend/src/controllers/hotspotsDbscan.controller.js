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

function parseTypes(value) {
  if (!value) return null;
  const arr = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

// GET /api/hotspots/dbscan?from=...&to=...&type=a,b,c&eps=200&minPoints=10
export async function getHotspotsDbscan(req, res) {
  try {
    const from = parseNullableDate(req.query.from);
    const to = parseNullableDate(req.query.to);

    const types = parseTypes(req.query.type);

    const eps = parseFloatWithDefault(req.query.eps, 200);
    const minPoints = parseIntWithDefault(req.query.minPoints, 10);

    const safeEps = Math.max(25, Math.min(eps, 2000));
    const safeMinPoints = Math.max(3, Math.min(minPoints, 200));

    // No types selected => all types
    if (!types) {
      const result = await pool.query(DBSCAN_SQL, [from, to, null, safeEps, safeMinPoints]);
      return res.json({
        filters: { from, to, type: null, eps: safeEps, minPoints: safeMinPoints },
        rows: result.rows,
      });
    }

    // One type
    if (types.length === 1) {
      const result = await pool.query(DBSCAN_SQL, [from, to, types[0], safeEps, safeMinPoints]);
      return res.json({
        filters: { from, to, type: types, eps: safeEps, minPoints: safeMinPoints },
        rows: result.rows,
      });
    }

    // Multiple types: run per type and merge
    const merged = [];
    for (const t of types) {
      const r = await pool.query(DBSCAN_SQL, [from, to, t, safeEps, safeMinPoints]);
      merged.push(...r.rows);
    }

    merged.sort((a, b) => Number(b.count || 0) - Number(a.count || 0));

    res.json({
      filters: { from, to, type: types, eps: safeEps, minPoints: safeMinPoints },
      rows: merged,
    });
  } catch (err) {
    console.error('getHotspotsDbscan failed:', err);
    res.status(500).json({ error: 'Failed to compute DBSCAN hotspots' });
  }
}
