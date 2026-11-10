import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { describe, expect, test } from "bun:test";
import { PlayerHistoryRepository } from "../../../src/repositories/player-history.repository";
import { TEST_PLAYER_ID } from "../../helpers/constants";

describe("PlayerHistoryRepository", () => {
  const seededDate = new Date("2024-06-01T12:00:00.000Z");

  test("findByPlayerAndDate returns seeded snapshot", async () => {
    const row = await PlayerHistoryRepository.findByPlayerAndDate(
      TEST_PLAYER_ID,
      seededDate,
      DEFAULT_REALM_ID
    );
    expect(row?.pp).toBe(100);
    expect(row?.rank).toBe(100);
  });

  test("getByPlayerOrderedByDateDesc returns recent history", async () => {
    const rows = await PlayerHistoryRepository.getByPlayerOrderedByDateDesc(
      TEST_PLAYER_ID,
      {
        count: 7,
        alignedStart: new Date("2024-05-01T00:00:00.000Z"),
        today: new Date("2024-06-02T00:00:00.000Z"),
      },
      DEFAULT_REALM_ID
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test("upsertRank updates rank for date", async () => {
    await PlayerHistoryRepository.upsertRank(TEST_PLAYER_ID, seededDate, 99, DEFAULT_REALM_ID);
    const row = await PlayerHistoryRepository.findByPlayerAndDate(
      TEST_PLAYER_ID,
      seededDate,
      DEFAULT_REALM_ID
    );
    expect(row?.rank).toBe(99);
  });

  test("incrementDailyCounter bumps ranked score counter", async () => {
    await PlayerHistoryRepository.incrementDailyCounter(
      TEST_PLAYER_ID,
      seededDate,
      "rankedScores",
      DEFAULT_REALM_ID
    );
    const row = await PlayerHistoryRepository.findByPlayerAndDate(
      TEST_PLAYER_ID,
      seededDate,
      DEFAULT_REALM_ID
    );
    expect((row?.rankedScores ?? 0) >= 2).toBe(true);
  });

  test("upsertByPlayerAndDate merges player history fields", async () => {
    const tomorrow = new Date("2024-06-02T12:00:00.000Z");
    await PlayerHistoryRepository.upsertByPlayerAndDate(
      TEST_PLAYER_ID,
      tomorrow,
      {
        pp: 101,
        medals: 6,
        rankedScores: 2,
      },
      DEFAULT_REALM_ID
    );
    const row = await PlayerHistoryRepository.findByPlayerAndDate(TEST_PLAYER_ID, tomorrow, DEFAULT_REALM_ID);
    expect(row?.pp).toBe(101);
    expect(row?.medals).toBe(6);
  });
});
