// Local development Postgres for CampusConnect — used because .env.local's
// DATABASE_URL is still the redacted "[SENSITIVE]" placeholder, so the real
// Supabase database is unreachable. Run with:
//
//   node scripts/local-postgres.mjs
//
// It keeps a data dir at ./.local-pg-data, listens on 55432, and creates the
// `campusfeed` database on first boot. Point DATABASE_URL at it:
//   postgres://postgres:localdev@localhost:55432/campusfeed
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dataDir = fileURLToPath(new URL("../.local-pg-data", import.meta.url));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "localdev",
  port: 55432,
  persistent: true,
  // Windows initdb defaults to the ANSI codepage (WIN1252), which cannot
  // store emoji — the seed data contains them. Force a UTF-8 cluster.
  initdbFlags: ["-E", "UTF8", "--locale=C"],
});

const fresh = !existsSync(dataDir);
if (fresh) {
  await pg.initialise();
}
await pg.start();
if (fresh) {
  await pg.createDatabase("campusfeed");
} else {
  // createDatabase errors if it already exists — that's fine on restarts.
  try {
    await pg.createDatabase("campusfeed");
  } catch {
    console.log("database already exists");
  }
}
console.log("LOCAL_PG_READY on 55432");

// Keep the process alive; SIGTERM/SIGINT shut Postgres down cleanly.
process.on("SIGTERM", async () => {
  await pg.stop();
  process.exit(0);
});
