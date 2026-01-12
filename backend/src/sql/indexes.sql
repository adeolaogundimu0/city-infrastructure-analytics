CREATE INDEX IF NOT EXISTS idx_requests_requested_at
  ON service_requests (requested_at);

CREATE INDEX IF NOT EXISTS idx_requests_status
  ON service_requests (status);

CREATE INDEX IF NOT EXISTS idx_requests_ward
  ON service_requests (ward);

CREATE INDEX IF NOT EXISTS idx_requests_geom
  ON service_requests USING GIST (geom);
