import { describe, expect, test } from "bun:test";
import {
  ScoreSaberScoreHistoryRepository,
  scoreRowToHistoryInsert,
} from "../../../src/repositories/scoresaber-score-history.repository";
import { TableCountsRepository } from "../../../src/repositories/table-counts.repository";
import {
  TEST_LEADERBOARD_ID,
  TEST_PLAYER_ID,
  TEST_SCORE_HISTORY_ID,
  TEST_SCORE_ID,
  UNKNOWN_LEADERBOARD_ID,
  UNKNOWN_PLAYER_ID,
  UNKNOWN_SCORE_ID,
} from "../../helpers/constants";
import { buildScoreRow } from "../../helpers/fixtures";

const ARCHIVE_SCORE_ID = 900_020;

describe("scoreRowToHistoryInsert", () => {
  test("copies score fields into a history insert shape", () => {
    const insert = scoreRowToHistoryInsert(buildScoreRow());
    expect(insert.scoreId).toBe(TEST_SCORE_ID);
    expect(insert.playerId).toBe(TEST_PLAYER_ID);
    expect(insert.leaderboardId).toBe(TEST_LEADERBOARD_ID);
    expect(insert.score).toBe(950);
  });
});

describe("ScoreSaberScoreHistoryRepository", () => {
  describe("findRowByScoreId", () => {
    test("returns the seeded history row", async () => {
      const row = await ScoreSaberScoreHistoryRepository.findRowByScoreId(TEST_SCORE_HISTORY_ID);
      expect(row?.score).toBe(800);
      expect(row?.playerId).toBe(TEST_PLAYER_ID);
    });

    test("returns undefined for an unknown score id", async () => {
      expect(await ScoreSaberScoreHistoryRepository.findRowByScoreId(UNKNOWN_SCORE_ID)).toBeUndefined();
    });
  });

  describe("countByPlayerId", () => {
    test("returns the number of history rows for the player", async () => {
      expect(await ScoreSaberScoreHistoryRepository.countByPlayerId(TEST_PLAYER_ID)).toBe(1);
    });

    test("returns zero for a player without history", async () => {
      expect(await ScoreSaberScoreHistoryRepository.countByPlayerId(UNKNOWN_PLAYER_ID)).toBe(0);
    });
  });

  describe("findExistingScoreIds", () => {
    test("returns only ids present in history", async () => {
      const set = await ScoreSaberScoreHistoryRepository.findExistingScoreIds([
        TEST_SCORE_HISTORY_ID,
        UNKNOWN_SCORE_ID,
      ]);
      expect(set.has(TEST_SCORE_HISTORY_ID)).toBe(true);
      expect(set.has(UNKNOWN_SCORE_ID)).toBe(false);
    });

    test("returns an empty set for an empty input", async () => {
      expect((await ScoreSaberScoreHistoryRepository.findExistingScoreIds([])).size).toBe(0);
    });
  });

  describe("insertAttempt", () => {
    test("inserts a history attempt for a player and leaderboard", async () => {
      const attempt = buildScoreRow({
        scoreId: ARCHIVE_SCORE_ID,
        score: 700,
        pp: 0,
        timestamp: new Date("2024-04-01T12:00:00.000Z"),
      });
      await ScoreSaberScoreHistoryRepository.insertAttempt(attempt, TEST_PLAYER_ID, TEST_LEADERBOARD_ID);
      const row = await ScoreSaberScoreHistoryRepository.findRowByScoreId(ARCHIVE_SCORE_ID);
      expect(row?.score).toBe(700);
    });

    test("is idempotent for duplicate player leaderboard score tuples", async () => {
      const attempt = buildScoreRow({
        scoreId: ARCHIVE_SCORE_ID,
        score: 800,
        pp: 0,
        timestamp: new Date("2024-04-01T12:00:00.000Z"),
      });
      const before = await ScoreSaberScoreHistoryRepository.countByPlayerId(TEST_PLAYER_ID);
      await ScoreSaberScoreHistoryRepository.insertAttempt(attempt, TEST_PLAYER_ID, TEST_LEADERBOARD_ID);
      await ScoreSaberScoreHistoryRepository.insertAttempt(attempt, TEST_PLAYER_ID, TEST_LEADERBOARD_ID);
      const after = await ScoreSaberScoreHistoryRepository.countByPlayerId(TEST_PLAYER_ID);
      expect(after).toBe(before);
    });
  });

  describe("findLatestRowBeforeTimestamp", () => {
    test("returns the latest history row before the timestamp", async () => {
      const row = await ScoreSaberScoreHistoryRepository.findLatestRowBeforeTimestamp(
        TEST_PLAYER_ID,
        TEST_LEADERBOARD_ID,
        new Date("2024-06-01T00:00:00.000Z")
      );
      expect(row?.scoreId).toBe(TEST_SCORE_HISTORY_ID);
    });

    test("returns undefined when no row exists before the timestamp", async () => {
      expect(
        await ScoreSaberScoreHistoryRepository.findLatestRowBeforeTimestamp(
          TEST_PLAYER_ID,
          TEST_LEADERBOARD_ID,
          new Date("2024-01-01T00:00:00.000Z")
        )
      ).toBeUndefined();
    });
  });

  describe("countCombinedScoresForPlayerMap", () => {
    test("counts current and historical scores together", async () => {
      const count = await ScoreSaberScoreHistoryRepository.countCombinedScoresForPlayerMap(
        TEST_PLAYER_ID,
        TEST_LEADERBOARD_ID
      );
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getCombinedScoresPageForPlayerMap", () => {
    test("returns both current and historical scores", async () => {
      const page = await ScoreSaberScoreHistoryRepository.getCombinedScoresPageForPlayerMap(
        TEST_PLAYER_ID,
        TEST_LEADERBOARD_ID,
        10,
        0
      );
      expect(page.length).toBeGreaterThanOrEqual(2);
      const scoreIds = page.map(row => row.scoreId);
      expect(scoreIds).toContain(TEST_SCORE_ID);
      expect(scoreIds).toContain(TEST_SCORE_HISTORY_ID);
    });
  });

  describe("getAccuracySeriesForPlayerMap", () => {
    test("returns chronological accuracy points", async () => {
      const series = await ScoreSaberScoreHistoryRepository.getAccuracySeriesForPlayerMap(
        TEST_PLAYER_ID,
        TEST_LEADERBOARD_ID
      );
      expect(series.length).toBeGreaterThanOrEqual(2);
      expect(series[0]!.timestamp.getTime()).toBeLessThan(series[1]!.timestamp.getTime());
    });
  });

  describe("getPpAccuracyByLeaderboardId", () => {
    test("returns history pp and accuracy rows for the leaderboard", async () => {
      const rows = await ScoreSaberScoreHistoryRepository.getPpAccuracyByLeaderboardId(TEST_LEADERBOARD_ID);
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.every(row => typeof row.accuracy === "number")).toBe(true);
    });

    test("returns an empty array for a leaderboard without history", async () => {
      expect(
        await ScoreSaberScoreHistoryRepository.getPpAccuracyByLeaderboardId(UNKNOWN_LEADERBOARD_ID)
      ).toEqual([]);
    });
  });

  describe("bulkUpsetHistoryScores", () => {
    test("updates history rows by id in bulk", async () => {
      const row = await ScoreSaberScoreHistoryRepository.findRowByScoreId(TEST_SCORE_HISTORY_ID);
      expect(row).toBeDefined();
      await ScoreSaberScoreHistoryRepository.bulkUpsetHistoryScores([{ id: row!.id, pp: 15 }]);
      const updated = await ScoreSaberScoreHistoryRepository.findRowByScoreId(TEST_SCORE_HISTORY_ID);
      expect(updated?.pp).toBe(15);
    });

    test("no-ops on empty or id-less updates", async () => {
      await ScoreSaberScoreHistoryRepository.bulkUpsetHistoryScores([]);
      await ScoreSaberScoreHistoryRepository.bulkUpsetHistoryScores([{ pp: 1 }]);
    });
  });

  describe("countTotal", () => {
    test("returns the history total from table counts", async () => {
      await TableCountsRepository.reconcile();
      expect(await ScoreSaberScoreHistoryRepository.countTotal()).toBeGreaterThanOrEqual(1);
    });
  });
});
