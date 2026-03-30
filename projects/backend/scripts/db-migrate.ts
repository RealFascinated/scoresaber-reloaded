/**
 * CLI: run SQL migrations with full error output. `bunx drizzle-kit migrate` uses a TUI that
 * does not render the error on failure (MigrateProgress ignores the rejected state), so
 * failures look like a silent exit with code 1.
 */
import "dotenv/config";
import { runMigrations } from "../src/db/run-migrations";

try {
  await runMigrations();
  console.log("Migrations applied successfully.");
} catch (err) {
  console.error(err);
  process.exit(1);
}
