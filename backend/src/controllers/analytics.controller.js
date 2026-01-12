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

// GET /api/analytics/top-types?from=...&to=...&limit=10
export async function getTopTypes(req, res) {
  try {
    const from = parseNullableDate(req.query.from);
    const to = parseNullableDate(req.query.to);
    const limit = parseIntWithDefault(req.query.limit, 10);
    const safeLimit = Math.max(1, Math.min(limit, 50));

    const result = await pool.query(
      `
      SELECT
        service_name AS type,
        COUNT(*)::int AS count
      FROM service_requests
      WHERE requested_at IS NOT NULL
        AND ($1::timestamp IS NULL OR requested_at >= $1::timestamp)
        AND ($2::timestamp IS NULL OR requested_at <  $2::timestamp)
      GROUP BY service_name
      ORDER BY count DESC
      LIMIT $3
      `,
      [from, to, safeLimit]
    );

    res.json({ filters: { from, to, limit: safeLimit }, rows: result.rows });
  } catch (err) {
    console.error('getTopTypes failed:', err);
    res.status(500).json({ error: 'Failed to fetch top types' });
  }
}
