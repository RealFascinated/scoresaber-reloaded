import Logger from "@ssr/common/logger";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { existsSync } from "node:fs";
import path from "node:path";
import { db } from "./index";

function resolveMigrationsFolder() {
  const fromCwd = path.resolve(process.cwd(), "drizzle");
  if (existsSync(path.join(fromCwd, "meta", "_journal.json"))) {
    return fromCwd;
  }
  return path.join(import.meta.dir, "..", "..", "drizzle");
}

export async function runMigrations() {
  await migrate(db, { migrationsFolder: resolveMigrationsFolder() }).catch(error => {
    Logger.error("Database migration failed:", error);
    throw error;
  });
}
