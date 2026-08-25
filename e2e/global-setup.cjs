/**
 * Playwright global setup — runs once before the entire test suite.
 *
 * Clears the bookings table so every test run starts from a clean slate.
 * Without this, the golden path test fails on re-runs because the room it
 * books for tomorrow is already taken from the previous run.
 *
 * Uses pg directly (not docker compose exec) so it works in both local dev
 * (Docker postgres) and CI (GitHub Actions service container postgres).
 * Uses .cjs (CommonJS) so it loads without ESM restrictions on Node 18+.
 */
const { Client } = require("pg");

module.exports = async function globalSetup() {
  const client = new Client({
    connectionString:
      process.env["DATABASE_URL"] ??
      "postgresql://bootcamp:bootcamp@localhost:5432/bootcamp",
  });
  await client.connect();
  await client.query("DELETE FROM bookings");
  await client.end();
};
