-- Enable PostGIS extension for spatial analytics
CREATE EXTENSION IF NOT EXISTS postgis;

-- Main table for 311 service requests
CREATE TABLE IF NOT EXISTS service_requests (
    request_id TEXT PRIMARY KEY,
    service_name TEXT,
    service_category TEXT,
    status TEXT,
    ward TEXT,
    address TEXT,

    -- Dates
    requested_at TIMESTAMP,
    closed_at TIMESTAMP,

    -- Spatial data
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOGRAPHY(Point, 4326)
);

-- Lookup table for normalized service categories
CREATE TABLE IF NOT EXISTS service_categories (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT UNIQUE
);

-- Bridge table (future-proofing analytics)
CREATE TABLE IF NOT EXISTS request_category_map (
    request_id TEXT REFERENCES service_requests(request_id),
    category_id INT REFERENCES service_categories(category_id),
    PRIMARY KEY (request_id, category_id)
);
