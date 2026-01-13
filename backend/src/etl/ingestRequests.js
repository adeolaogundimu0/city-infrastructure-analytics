// backend/src/etl/ingestRequests.js
import fs from 'fs';
import os from 'os';
import path from 'path';

import fetch from 'node-fetch';
import csv from 'csv-parser';

import pool from '../config/db.js';

const CSV_URL =
  'https://311opendatastorage.blob.core.windows.net/311data/311opendata_currentyear.csv';

// Column names (exactly as in the CSV header)
const COLS = {
  id: 'Service Request ID | Numéro de demande',
  status: 'Status | État',
  type: 'Type | Type',
  description: 'Description | Description',
  opened: "Opened Date | Date d'ouverture",
  closed: 'Closed Date | Date de fermeture',
  address: 'Address | Adresse',
  lat: 'Latitude | Latitude',
  lon: 'Longitude | Longitude',
  ward: 'Ward | Quartier',
  channel: 'Channel | Voie de service',
};

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseFloatOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

async function downloadCsvToTempFile() {
  const tmpPath = path.join(os.tmpdir(), `ottawa311_${Date.now()}.csv`);
  const res = await fetch(CSV_URL);

  if (!res.ok) {
    throw new Error(`Failed to download CSV (${res.status}): ${CSV_URL}`);
  }

  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(tmpPath);
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

  return tmpPath;
}

async function upsertRequest({
  requestId,
  status,
  type,
  description,
  address,
  ward,
  requestedAt,
  closedAt,
  latitude,
  longitude,
}) {
  // Important: cast $9 and $10 everywhere they appear (including the CASE condition)
  const sql = `
    INSERT INTO service_requests (
      request_id,
      service_name,
      service_category,
      status,
      ward,
      address,
      requested_at,
      closed_at,
      latitude,
      longitude,
      geom
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8,
      $9::double precision,
      $10::double precision,
      CASE
        WHEN $9::double precision IS NOT NULL
         AND $10::double precision IS NOT NULL
        THEN ST_SetSRID(
          ST_MakePoint($10::double precision, $9::double precision),
          4326
        )::geography
        ELSE NULL
      END
    )
    ON CONFLICT (request_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      ward = EXCLUDED.ward,
      address = EXCLUDED.address,
      requested_at = EXCLUDED.requested_at,
      closed_at = EXCLUDED.closed_at,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      geom = EXCLUDED.geom,
      service_name = EXCLUDED.service_name,
      service_category = EXCLUDED.service_category
    RETURNING request_id
  `;

  const params = [
    requestId,
    type || null, // service_name
    null, // service_category (optional future refinement)
    status,
    ward,
    address,
    requestedAt,
    closedAt,
    latitude,
    longitude,
  ];

  const result = await pool.query(sql, params);
  return result.rowCount > 0;
}

async function upsertCategoryAndMap(requestId, type) {
  if (!type) return;

  // Insert category if missing
  await pool.query(
    `
    INSERT INTO service_categories (category_name)
    VALUES ($1)
    ON CONFLICT (category_name) DO NOTHING
    `,
    [type]
  );

  // Fetch category_id
  const { rows } = await pool.query(
    `SELECT category_id FROM service_categories WHERE category_name = $1`,
    [type]
  );
  const catId = rows[0]?.category_id;
  if (!catId) return;

  // Insert mapping
  await pool.query(
    `
    INSERT INTO request_category_map (request_id, category_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [requestId, catId]
  );
}

async function ingest() {
  console.log('Starting ETL: Ottawa 311 -> Postgres');

  const csvPath = await downloadCsvToTempFile();
  console.log('Downloaded CSV to:', csvPath);

  let processed = 0;
  let insertedOrUpdated = 0;
  let skipped = 0;
  let failed = 0;

  const stream = fs
    .createReadStream(csvPath)
    .pipe(
      csv({
        mapHeaders: ({ header }) => (header ? header.trim() : header),
      })
    );

  try {
    for await (const row of stream) {
      processed += 1;

      try {
        const requestId = row[COLS.id]?.trim();
        if (!requestId) {
          skipped += 1;
          continue;
        }

        const status = (row[COLS.status] || '').trim() || null;
        const type = (row[COLS.type] || '').trim() || null;
        const description = (row[COLS.description] || '').trim() || null;
        const address = (row[COLS.address] || '').trim() || null;
        const ward = (row[COLS.ward] || '').trim() || null;

        const requestedAt = parseDate(row[COLS.opened]);
        const closedAt = parseDate(row[COLS.closed]);

        const latitude = parseFloatOrNull(row[COLS.lat]);
        const longitude = parseFloatOrNull(row[COLS.lon]);

        const ok = await upsertRequest({
          requestId,
          status,
          type,
          description,
          address,
          ward,
          requestedAt,
          closedAt,
          latitude,
          longitude,
        });

        if (ok) insertedOrUpdated += 1;

        // Normalize category mapping (uses Type)
        if (type) {
          await upsertCategoryAndMap(requestId, type);
        }

        if (processed % 500 === 0) {
          console.log(
            `Progress: processed=${processed}, inserted/updated=${insertedOrUpdated}, skipped=${skipped}, failed=${failed}`
          );
        }
      } catch (err) {
        failed += 1;
        if (failed <= 10) console.error('Row failed:', err.message);
      }
    }

    console.log('ETL complete.');
    console.log({ processed, insertedOrUpdated, skipped, failed });
  } finally {
    // Cleanup temp file
    try {
      fs.unlinkSync(csvPath);
    } catch {}

    
    await pool.end();
  }
}

ingest().catch((err) => {
  console.error('ETL failed:', err);
  process.exit(1);
});
