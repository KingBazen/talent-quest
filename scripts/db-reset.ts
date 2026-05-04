// Drops every TalentQuest table and re-creates the schema. DEV USE ONLY.
// Never run against a production DATABASE_URL.
try { process.loadEnvFile(".env.local"); } catch {}
try { process.loadEnvFile(".env"); } catch {}

import { ensureMigrated, pool } from "../src/lib/db";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("db:reset refused: NODE_ENV is production");
  }
  await pool.query(`
    DROP TABLE IF EXISTS scores         CASCADE;
    DROP TABLE IF EXISTS score_notes    CASCADE;
    DROP TABLE IF EXISTS submissions    CASCADE;
    DROP TABLE IF EXISTS progress_steps CASCADE;
    DROP TABLE IF EXISTS payments       CASCADE;
    DROP TABLE IF EXISTS contact_messages CASCADE;
    DROP TABLE IF EXISTS contestants    CASCADE;
    DROP TABLE IF EXISTS users          CASCADE;
  `);
  await ensureMigrated();
  console.log("[db-reset] dropped + recreated all tables");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
