import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberScoresTable } from "../db/schema";
import { TableCountsRepository } from "./table-counts.repository";

describe("TableCountsRepository", () => {
  describe("getCounts", () => {
    test("returns the singleton counts row", async () => {
      const counts = await TableCountsRepository.getCounts();
      expect(counts.id).toBe(1);
      expect(counts.refreshedAt).toBeInstanceOf(Date);
    });

    test("includes non-negative totals for every tracked table", async () => {
      const counts = await TableCountsRepository.getCounts();
      expect(counts.scoresaberAccounts).toBeGreaterThanOrEqual(3);
      expect(counts.scoresaberLeaderboards).toBeGreaterThanOrEqual(2);
      expect(counts.scoresaberScores).toBeGreaterThanOrEqual(2);
      expect(counts.scoresaberScoreHistory).toBeGreaterThanOrEqual(1);
      expect(counts.scoresaberInactiveAccounts).toBeGreaterThanOrEqual(1);
    });
  });

  describe("reconcile", () => {
    test("refreshes counts from live table totals", async () => {
      const before = await TableCountsRepository.getCounts();
      await TableCountsRepository.reconcile();
      const after = await TableCountsRepository.getCounts();

      expect(after.scoresaberAccounts).toBeGreaterThanOrEqual(before.scoresaberAccounts);
      expect(after.scoresaberScores).toBeGreaterThanOrEqual(before.scoresaberScores);
      expect(after.refreshedAt.getTime()).toBeGreaterThanOrEqual(before.refreshedAt.getTime());
    });

    test("leaves the singleton row id unchanged", async () => {
      await TableCountsRepository.reconcile();
      expect((await TableCountsRepository.getCounts()).id).toBe(1);
    });
  });

  describe("insert triggers", () => {
    test("an insert that conflicts on every row does not lock the counter row", async () => {
      const [existing] = await db.select().from(scoreSaberScoresTable).limit(1);
      let release!: () => void;
      const held = new Promise<void>(resolve => {
        release = resolve;
      });
      let locked!: () => void;
      const lockAcquired = new Promise<void>(resolve => {
        locked = resolve;
      });
      const locker = db.transaction(async tx => {
        await tx.execute(sql`SELECT 1 FROM "ssr_table_counts" WHERE "id" = 1 FOR UPDATE`);
        locked();
        await held;
      });
      await lockAcquired;

      const outcome = await Promise.race([
        db
          .insert(scoreSaberScoresTable)
          .values(existing)
          .onConflictDoNothing()
          .then(() => "completed"),
        Bun.sleep(2000).then(() => "blocked"),
      ]);
      release();
      await locker;

      expect(outcome).toBe("completed");
    });
  });
});
