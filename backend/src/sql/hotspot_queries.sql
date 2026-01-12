-- Hotspot query (grid-based)
-- Notes:
-- - geom is stored as geography(Point,4326); we cast to geometry and transform to EPSG:3857
-- - grid_size_m controls cell size in meters (e.g., 250 = ~250m grid)
-- - We return one row per grid cell per month + type (service_name)
-- - You can filter by date range + type + minimum count

-- Parameters (positional):
-- $1 = from_ts (timestamp) nullable
-- $2 = to_ts (timestamp) nullable
-- $3 = service_name filter nullable
-- $4 = min_count (int)
-- $5 = grid_size_m (double)

WITH base AS (
  SELECT
    request_id,
    service_name,
    requested_at,
    geom
  FROM service_requests
  WHERE geom IS NOT NULL
    AND requested_at IS NOT NULL
    AND ($1::timestamp IS NULL OR requested_at >= $1::timestamp)
    AND ($2::timestamp IS NULL OR requested_at <  $2::timestamp)
    AND ($3::text IS NULL OR service_name = $3::text)
),
projected AS (
  SELECT
    service_name,
    date_trunc('month', requested_at) AS month_bucket,
    -- transform to meters-based CRS for grid snapping
    ST_Transform(geom::geometry, 3857) AS geom_3857
  FROM base
),
gridded AS (
  SELECT
    service_name,
    month_bucket,
    ST_SnapToGrid(geom_3857, $5::double precision) AS cell_geom_3857
  FROM projected
),
agg AS (
  SELECT
    service_name,
    month_bucket,
    cell_geom_3857,
    COUNT(*) AS request_count
  FROM gridded
  GROUP BY service_name, month_bucket, cell_geom_3857
)
SELECT
  service_name AS type,
  month_bucket AS month,
  request_count::int AS count,

  ST_Y(ST_Transform(ST_Centroid(cell_geom_3857), 4326))::double precision AS lat,
  ST_X(ST_Transform(ST_Centroid(cell_geom_3857), 4326))::double precision AS lon,

  ST_AsGeoJSON(ST_Transform(ST_Centroid(cell_geom_3857), 4326)) AS centroid_geojson
FROM agg
WHERE request_count >= $4::int
ORDER BY request_count DESC
LIMIT 500;

