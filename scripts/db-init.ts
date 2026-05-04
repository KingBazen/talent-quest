// Runs all migrations against the Postgres database in DATABASE_URL.
// Idempotent — safe to re-run.
try { process.loadEnvFile(".env.local"); } catch {}
try { process.loadEnvFile(".env"); } catch {}

import { ensureMigrated, getPool } from "../src/lib/db";

async function main() {
  await ensureMigrated();
  console.log("[db-init] schema applied");
  await getPool().end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
