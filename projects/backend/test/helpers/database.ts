import { env } from "@ssr/common/env";
import { sql } from "drizzle-orm";
import { Client } from "pg";
import { redisClient } from "../../src/common/redis";
import { db } from "../../src/db";
import { runMigrations } from "../../src/db/run-migrations";
import { ScoreSaberMedalsRepository } from "../../src/repositories/scoresaber-medals.repository";
import { TableCountsRepository } from "../../src/repositories/table-counts.repository";
import { seedCachedScoreSaberPlayerTokens, seedTestDatabase, truncateTestTables } from "./seed";

const ADVISORY_LOCK_ID = 900_001;
const MAX_RESET_ATTEMPTS = 5;
const SUITE_LOCK_TIMEOUT_MS = 120_000;

let migrationsReady: Promise<void> | undefined;
let lockClient: Client | undefined;
let suiteLockHeld = false;

function isTransientPostgresError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : "";

  return (
    code === "40P01" ||
    message.includes("deadlock detected") ||
    message.includes("recovery mode") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Connection terminated") ||
    message.includes("the database system is starting up")
  );
}

async function waitForPostgres(maxAttempts = 60): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db.execute(sql`SELECT 1`);
      return;
    } catch (error) {
      if (!isTransientPostgresError(error) || attempt === maxAttempts) {
        throw error;
      }

      await Bun.sleep(Math.min(attempt * 100, 2_000));
    }
  }
}

async function getLockClient(): Promise<Client> {
  if (!lockClient) {
    lockClient = new Client({ connectionString: env.DATABASE_URL });
    await lockClient.connect();
  }

  return lockClient;
}

/**
 * Holds a session-scoped advisory lock for the entire integration test run so
 * concurrent `bun test` processes cannot truncate tables while another suite is
 * executing assertions.
 */
export async function acquireTestSuiteLock(): Promise<void> {
  if (suiteLockHeld) {
    return;
  }

  await waitForPostgres();
  const client = await getLockClient();
  const deadline = Date.now() + SUITE_LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock($1) AS acquired", [
      ADVISORY_LOCK_ID,
    ]);
    if (result.rows[0]?.acquired === true) {
      suiteLockHeld = true;
      return;
    }

    await Bun.sleep(100);
  }

  throw new Error(
    `Timed out after ${SUITE_LOCK_TIMEOUT_MS}ms waiting for the test database advisory lock. ` +
      "Another test runner or stale bun process may still be holding it."
  );
}

export async function releaseTestSuiteLock(): Promise<void> {
  if (!lockClient || !suiteLockHeld) {
    return;
  }

  await lockClient.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_ID]);
  await lockClient.end();
  lockClient = undefined;
  suiteLockHeld = false;
}

async function resetTestDatabaseOnce(): Promise<void> {
  await flushTestRedis();
  await truncateTestTables();
  await seedTestDatabase();
  await TableCountsRepository.reconcile();
  await ScoreSaberMedalsRepository.syncGlobalMedalTotalsFromScoresTable();
  await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
  await seedCachedScoreSaberPlayerTokens();
}

export async function resetTestDatabase(): Promise<void> {
  await acquireTestSuiteLock();
  await ensureTestMigrations();

  for (let attempt = 1; attempt <= MAX_RESET_ATTEMPTS; attempt++) {
    try {
      await resetTestDatabaseOnce();
      return;
    } catch (error) {
      if (!isTransientPostgresError(error) || attempt === MAX_RESET_ATTEMPTS) {
        throw error;
      }

      await Bun.sleep(Math.min(attempt * 200, 2_000));
    }
  }
}

export async function ensureTestMigrations(): Promise<void> {
  migrationsReady ??= (async () => {
    await runMigrations();
  })();

  await migrationsReady;
}

export async function ensureTestDatabase(): Promise<void> {
  await acquireTestSuiteLock();
  await ensureTestMigrations();
  await resetTestDatabase();
}

async function flushTestRedis(): Promise<void> {
  await redisClient.flushdb();
}
