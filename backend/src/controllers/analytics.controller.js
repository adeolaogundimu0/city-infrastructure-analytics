import pool from '../config/db.js';

function parseNullableDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseIntWithDefault(v, def) {
  const n = Number.parseInt(v, 10);
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

// GET /api/analytics/top-types?from=...&to=...&limit=10&type=a,b,c
export async function getTopTypes(req, res) {
  try {
    const from = parseNullableDate(req.query.from);
    const to = parseNullableDate(req.query.to);
    const limit = parseIntWithDefault(req.query.limit, 10);
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const types = parseTypes(req.query.type);

    const result = await pool.query(
      `
      SELECT
        service_name AS type,
        COUNT(*)::int AS count
      FROM service_requests
      WHERE requested_at IS NOT NULL
        AND ($1::timestamp IS NULL OR requested_at >= $1::timestamp)
        AND ($2::timestamp IS NULL OR requested_at <  $2::timestamp)
        AND ($3::text[] IS NULL OR service_name = ANY($3::text[]))
      GROUP BY service_name
      ORDER BY count DESC
      LIMIT $4
      `,
      [from, to, types, safeLimit]
    );

    res.json({ filters: { from, to, limit: safeLimit, type: types }, rows: result.rows });
  } catch (err) {
    console.error('getTopTypes failed:', err);
    res.status(500).json({ error: 'Failed to fetch top types' });
  }
}

// GET /api/analytics/date-range
export async function getDateRange(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        MIN(requested_at) AS min_date,
        MAX(requested_at) AS max_date
      FROM service_requests
      WHERE requested_at IS NOT NULL
      `
    );

    const row = result.rows[0] || { min_date: null, max_date: null };
    res.json({ min: row.min_date, max: row.max_date });
  } catch (err) {
    console.error('getDateRange failed:', err);
    res.status(500).json({ error: 'Failed to fetch date range' });
  }
}

// ✅ NEW: GET /api/analytics/type-location-coverage?from=&to=&minGeom=3
export async function getTypeLocationCoverage(req, res) {
  try {
    const from = parseNullableDate(req.query.from);
    const to = parseNullableDate(req.query.to);
    const minGeom = parseIntWithDefault(req.query.minGeom, 3);
    const safeMinGeom = Math.max(0, Math.min(minGeom, 1000));

    const result = await pool.query(
      `
      SELECT
        service_name AS type,
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE geom IS NOT NULL)::int AS with_geom,
        (COUNT(*) FILTER (WHERE geom IS NOT NULL) >= $3)::boolean AS has_location
      FROM service_requests
      WHERE service_name IS NOT NULL AND service_name <> ''
        AND requested_at IS NOT NULL
        AND ($1::timestamp IS NULL OR requested_at >= $1::timestamp)
        AND ($2::timestamp IS NULL OR requested_at <  $2::timestamp)
      GROUP BY service_name
      ORDER BY service_name ASC
      `,
      [from, to, safeMinGeom]
    );

    res.json({
      filters: { from, to, minGeom: safeMinGeom },
      rows: result.rows,
    });
  } catch (err) {
    console.error('getTypeLocationCoverage failed:', err);
    res.status(500).json({ error: 'Failed to fetch type location coverage' });
  }
}
