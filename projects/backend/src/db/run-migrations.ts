import Logger from "@ssr/common/logger";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { existsSync } from "node:fs";
import path from "node:path";
import { db } from "./index";

/**
 * Prefer `process.cwd()/drizzle` so `bun build --compile` binaries work when run with
 * WORKDIR set to the backend root (e.g. Docker). Fall back to the source tree layout for `bun run src/...` from other cwd values.
 */
function resolveMigrationsFolder(): string {
  const fromCwd = path.resolve(process.cwd(), "drizzle");
  if (existsSync(path.join(fromCwd, "meta", "_journal.json"))) {
    return fromCwd;
  }
  return path.join(import.meta.dir, "..", "..", "drizzle");
}

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: resolveMigrationsFolder() }).catch(error => {
    Logger.error("Database migration failed:", error);
    throw error;
  });
}
