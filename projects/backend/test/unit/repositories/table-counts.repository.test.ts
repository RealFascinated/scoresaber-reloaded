import { describe, expect, test } from "bun:test";
import { TableCountsRepository } from "../../../src/repositories/table-counts.repository";

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
});
