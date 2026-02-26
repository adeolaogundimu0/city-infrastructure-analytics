import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: "../.env" });

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
  connectionTimeoutMillis: 15000,
});

try {

  await client.connect();

  await client.query("SELECT NOW();");

  console.log("Supabase keep-alive successful");

} catch (err) {

  console.error("Keep-alive failed:", err.message);

} finally {

  await client.end();

}