import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load SQL once at startup
const SQL_PATH = path.join(__dirname, '../sql/hotspot_queries.sql');
const HOTSPOT_SQL = fs.readFileSync(SQL_PATH, 'utf8');

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

// GET /api/hotspots?from=2025-01-01&to=2026-01-01&type=...&minCount=10&grid=250
export async function getHotspots(req, res) {
  try {
    const from = parseNullableDate(req.query.from);
    const to = parseNullableDate(req.query.to);
    const type = req.query.type ? String(req.query.type) : null;

    const minCount = parseIntWithDefault(req.query.minCount, 10);
    const grid = parseFloatWithDefault(req.query.grid, 250); // meters

    // Guardrails (avoid silly values)
    const safeMinCount = Math.max(1, Math.min(minCount, 10000));
    const safeGrid = Math.max(50, Math.min(grid, 5000)); // 50m to 5km

    const result = await pool.query(HOTSPOT_SQL, [
      from,
      to,
      type,
      safeMinCount,
      safeGrid,
    ]);

    res.json({
      filters: { from, to, type, minCount: safeMinCount, grid: safeGrid },
      rows: result.rows,
    });
  } catch (err) {
    console.error('getHotspots failed:', err);
    res.status(500).json({ error: 'Failed to compute hotspots' });
  }
}
