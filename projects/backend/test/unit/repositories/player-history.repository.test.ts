import { describe, expect, test } from "bun:test";
import { PlayerHistoryRepository } from "../../../src/repositories/player-history.repository";
import { TEST_PLAYER_ID } from "../../helpers/constants";

describe("PlayerHistoryRepository", () => {
  const seededDate = new Date("2024-06-01T12:00:00.000Z");

  test("findByPlayerAndDate returns seeded snapshot", async () => {
    const row = await PlayerHistoryRepository.findByPlayerAndDate(TEST_PLAYER_ID, seededDate);
    expect(row?.pp).toBe(100);
    expect(row?.rank).toBe(100);
  });

  test("getByPlayerOrderedByDateDesc returns recent history", async () => {
    const rows = await PlayerHistoryRepository.getByPlayerOrderedByDateDesc(TEST_PLAYER_ID, {
      count: 7,
      alignedStart: new Date("2024-05-01T00:00:00.000Z"),
      today: new Date("2024-06-02T00:00:00.000Z"),
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test("upsertRank updates rank for date", async () => {
    await PlayerHistoryRepository.upsertRank(TEST_PLAYER_ID, seededDate, 99);
    const row = await PlayerHistoryRepository.findByPlayerAndDate(TEST_PLAYER_ID, seededDate);
    expect(row?.rank).toBe(99);
  });

  test("incrementDailyCounter bumps ranked score counter", async () => {
    await PlayerHistoryRepository.incrementDailyCounter(TEST_PLAYER_ID, seededDate, "rankedScores");
    const row = await PlayerHistoryRepository.findByPlayerAndDate(TEST_PLAYER_ID, seededDate);
    expect((row?.rankedScores ?? 0) >= 2).toBe(true);
  });

  test("upsertByPlayerAndDate merges player history fields", async () => {
    const tomorrow = new Date("2024-06-02T12:00:00.000Z");
    await PlayerHistoryRepository.upsertByPlayerAndDate(TEST_PLAYER_ID, tomorrow, {
      pp: 101,
      medals: 6,
      rankedScores: 2,
    });
    const row = await PlayerHistoryRepository.findByPlayerAndDate(TEST_PLAYER_ID, tomorrow);
    expect(row?.pp).toBe(101);
    expect(row?.medals).toBe(6);
  });
});
