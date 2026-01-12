-- DBSCAN clustering hotspots
-- Params:
-- $1 from_ts (nullable)
-- $2 to_ts (nullable)
-- $3 service_name (nullable)
-- $4 eps_meters (double)  e.g., 200
-- $5 min_points (int)     e.g., 10

WITH base AS (
  SELECT
    request_id,
    service_name,
    requested_at,
    ST_Transform(geom::geometry, 3857) AS geom_3857
  FROM service_requests
  WHERE geom IS NOT NULL
    AND requested_at IS NOT NULL
    AND ($1::timestamp IS NULL OR requested_at >= $1::timestamp)
    AND ($2::timestamp IS NULL OR requested_at <  $2::timestamp)
    AND ($3::text IS NULL OR service_name = $3::text)
),
clustered AS (
  SELECT
    service_name,
    date_trunc('month', requested_at) AS month_bucket,
    geom_3857,
    ST_ClusterDBSCAN(geom_3857, eps := $4::double precision, minpoints := $5::int)
      OVER (PARTITION BY service_name, date_trunc('month', requested_at)) AS cluster_id
  FROM base
),
agg AS (
  SELECT
    service_name,
    month_bucket,
    cluster_id,
    COUNT(*) AS request_count,
    ST_Centroid(ST_Collect(geom_3857)) AS centroid_3857
  FROM clustered
  WHERE cluster_id IS NOT NULL
  GROUP BY service_name, month_bucket, cluster_id
)
SELECT
  service_name AS type,
  month_bucket AS month,
  request_count::int AS count,
  ST_Y(ST_Transform(centroid_3857, 4326))::double precision AS lat,
  ST_X(ST_Transform(centroid_3857, 4326))::double precision AS lon,
  ST_AsGeoJSON(ST_Transform(centroid_3857, 4326)) AS centroid_geojson
FROM agg
ORDER BY request_count DESC
LIMIT 500;
