import { describe, expect, test } from "bun:test";
import { desc, eq } from "drizzle-orm";
import { scoreSaberScoresTable } from "../../../src/db/schema";
import {
  emptyScoreSaberPlayerScoreStatistics,
  ScoreSaberScoresRepository,
} from "../../../src/repositories/scoresaber-scores.repository";
import { TableCountsRepository } from "../../../src/repositories/table-counts.repository";
import {
  TEST_LEADERBOARD_ID,
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_TWO_ID,
  TEST_SCORE_ID,
  UNKNOWN_LEADERBOARD_ID,
  UNKNOWN_PLAYER_ID,
  UNKNOWN_SCORE_ID,
} from "../../helpers/constants";
import { buildScoreRow } from "../../helpers/fixtures";

const INSERT_SCORE_ID = 900_010;
const DUPLICATE_SCORE_ID = 900_012;

describe("ScoreSaberScoresRepository", () => {
  describe("findPlayerIdsInTimeRange", () => {
    test("returns players with scores inside the inclusive window", async () => {
      const row = await ScoreSaberScoresRepository.findRowByScoreId(TEST_SCORE_ID);
      const from = new Date(row!.timestamp.getTime() - 1000);
      const to = new Date(row!.timestamp.getTime() + 1000);
      const ids = await ScoreSaberScoresRepository.findPlayerIdsInTimeRange([TEST_PLAYER_ID], from, to);
      expect(ids).toContain(TEST_PLAYER_ID);
    });

    test("returns an empty array when no players match", async () => {
      const ids = await ScoreSaberScoresRepository.findPlayerIdsInTimeRange(
        [UNKNOWN_PLAYER_ID],
        new Date("2024-01-01T00:00:00.000Z"),
        new Date("2024-12-31T00:00:00.000Z")
      );
      expect(ids).toEqual([]);
    });
  });

  describe("findRowByScoreId", () => {
    test("returns the seeded score", async () => {
      const row = await ScoreSaberScoresRepository.findRowByScoreId(TEST_SCORE_ID);
      expect(row?.playerId).toBe(TEST_PLAYER_ID);
      expect(row?.leaderboardId).toBe(TEST_LEADERBOARD_ID);
    });

    test("returns undefined for an unknown score id", async () => {
      expect(await ScoreSaberScoresRepository.findRowByScoreId(UNKNOWN_SCORE_ID)).toBeUndefined();
    });
  });

  describe("rowExistsByScoreId", () => {
    test("returns true for a seeded score", async () => {
      expect(await ScoreSaberScoresRepository.rowExistsByScoreId(TEST_SCORE_ID)).toBe(true);
    });

    test("returns false for an unknown score", async () => {
      expect(await ScoreSaberScoresRepository.rowExistsByScoreId(UNKNOWN_SCORE_ID)).toBe(false);
    });
  });

  describe("findExistingScoreIds", () => {
    test("returns only ids that exist", async () => {
      const set = await ScoreSaberScoresRepository.findExistingScoreIds([TEST_SCORE_ID, UNKNOWN_SCORE_ID]);
      expect(set.has(TEST_SCORE_ID)).toBe(true);
      expect(set.has(UNKNOWN_SCORE_ID)).toBe(false);
    });

    test("returns an empty set for an empty input", async () => {
      expect((await ScoreSaberScoresRepository.findExistingScoreIds([])).size).toBe(0);
    });
  });

  describe("existsByScoreIdAndScore", () => {
    test("returns true when both id and score value match", async () => {
      const row = await ScoreSaberScoresRepository.findRowByScoreId(TEST_SCORE_ID);
      expect(await ScoreSaberScoresRepository.existsByScoreIdAndScore(TEST_SCORE_ID, row!.score)).toBe(true);
    });

    test("returns false when the score value differs", async () => {
      expect(await ScoreSaberScoresRepository.existsByScoreIdAndScore(TEST_SCORE_ID, -1)).toBe(false);
    });
  });

  describe("findByPlayerAndLeaderboard", () => {
    test("returns the current personal best row", async () => {
      const row = await ScoreSaberScoresRepository.findByPlayerAndLeaderboard(
        TEST_PLAYER_ID,
        TEST_LEADERBOARD_ID
      );
      expect(row?.scoreId).toBe(TEST_SCORE_ID);
    });

    test("returns undefined when the player has no score on the map", async () => {
      expect(
        await ScoreSaberScoresRepository.findByPlayerAndLeaderboard(UNKNOWN_PLAYER_ID, TEST_LEADERBOARD_ID)
      ).toBeUndefined();
    });
  });

  describe("insertScore", () => {
    test("inserts a new score row", async () => {
      const inserted = await ScoreSaberScoresRepository.insertScore(
        buildScoreRow({
          scoreId: INSERT_SCORE_ID,
          playerId: TEST_PLAYER_TWO_ID,
          leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
          pp: 0,
        })
      );
      expect(inserted).toBe(true);
      expect(await ScoreSaberScoresRepository.findRowByScoreId(INSERT_SCORE_ID)).toBeDefined();
    });

    test("returns false on duplicate score id", async () => {
      const row = buildScoreRow({
        scoreId: DUPLICATE_SCORE_ID,
        playerId: TEST_PLAYER_TWO_ID,
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
      });

      expect(await ScoreSaberScoresRepository.insertScore(row)).toBe(true);
      expect(await ScoreSaberScoresRepository.insertScore(row)).toBe(false);
    });
  });

  describe("replaceScore", () => {
    test("replaces the current row and archives the previous attempt", async () => {
      const original = await ScoreSaberScoresRepository.findRowByScoreId(TEST_SCORE_ID);
      const replacementId = 900_011;
      const replaced = await ScoreSaberScoresRepository.replaceScore({
        ...original!,
        scoreId: replacementId,
        score: original!.score + 5,
        timestamp: new Date(original!.timestamp.getTime() + 60_000),
      });
      expect(replaced).toBe(true);
      const current = await ScoreSaberScoresRepository.findByPlayerAndLeaderboard(
        TEST_PLAYER_ID,
        TEST_LEADERBOARD_ID
      );
      expect(current?.scoreId).toBe(replacementId);
    });
  });

  describe("countByPlayerId", () => {
    test("returns the seeded score count for a player", async () => {
      expect(await ScoreSaberScoresRepository.countByPlayerId(TEST_PLAYER_ID)).toBe(1);
    });

    test("returns zero for an unknown player", async () => {
      expect(await ScoreSaberScoresRepository.countByPlayerId(UNKNOWN_PLAYER_ID)).toBe(0);
    });
  });

  describe("countByLeaderboardId", () => {
    test("returns the seeded score count for a leaderboard", async () => {
      expect(await ScoreSaberScoresRepository.countByLeaderboardId(TEST_LEADERBOARD_ID)).toBe(2);
    });

    test("returns zero for an unknown leaderboard", async () => {
      expect(await ScoreSaberScoresRepository.countByLeaderboardId(UNKNOWN_LEADERBOARD_ID)).toBe(0);
    });
  });

  describe("countTotal", () => {
    test("returns the total score count from table counts", async () => {
      await TableCountsRepository.reconcile();
      expect(await ScoreSaberScoresRepository.countTotal()).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getTopScores", () => {
    test("returns ranked scores for non-banned players", async () => {
      const rows = await ScoreSaberScoresRepository.getTopScores(10, 0);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows[0]!.pp).toBeGreaterThanOrEqual(rows[1]!.pp);
    });
  });

  describe("selectTopPp", () => {
    test("returns pp values in descending order", async () => {
      const rows = await ScoreSaberScoresRepository.selectTopPp(5);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows[0]!.pp).toBeGreaterThanOrEqual(rows[1]!.pp);
    });
  });

  describe("getRankedRowsByPlayerId", () => {
    test("returns ranked rows for a seeded player", async () => {
      const rows = await ScoreSaberScoresRepository.getRankedRowsByPlayerId(TEST_PLAYER_ID);
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.every(row => row.pp > 0)).toBe(true);
    });
  });

  describe("getPlayerScoreStatistics", () => {
    test("returns aggregate statistics for a seeded player", async () => {
      const stats = await ScoreSaberScoresRepository.getPlayerScoreStatistics(TEST_PLAYER_ID);
      expect(stats.totalScores).toBeGreaterThanOrEqual(1);
      expect(stats.totalRankedScores).toBeGreaterThanOrEqual(1);
    });

    test("returns zeroed statistics for an unknown player", async () => {
      expect(await ScoreSaberScoresRepository.getPlayerScoreStatistics(UNKNOWN_PLAYER_ID)).toEqual(
        emptyScoreSaberPlayerScoreStatistics()
      );
    });
  });

  describe("getPpAndScoreIdByPlayer", () => {
    test("returns pp rows for a seeded player", async () => {
      const rows = await ScoreSaberScoresRepository.getPpAndScoreIdByPlayer(TEST_PLAYER_ID);
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows[0]!.scoreId).toBe(TEST_SCORE_ID);
    });
  });

  describe("selectDistinctLeaderboardIdsByPlayerId", () => {
    test("returns leaderboard ids for a seeded player", async () => {
      const ids = await ScoreSaberScoresRepository.selectDistinctLeaderboardIdsByPlayerId(TEST_PLAYER_ID);
      expect(ids).toContain(TEST_LEADERBOARD_ID);
    });
  });

  describe("countFriendScoresOnLeaderboard", () => {
    test("counts friend scores on a seeded leaderboard", async () => {
      const count = await ScoreSaberScoresRepository.countFriendScoresOnLeaderboard(
        [TEST_PLAYER_ID, TEST_PLAYER_TWO_ID],
        TEST_LEADERBOARD_ID
      );
      expect(count).toBe(2);
    });
  });

  describe("findFriendScoresOnLeaderboardPage", () => {
    test("returns friend scores for a seeded leaderboard", async () => {
      const rows = await ScoreSaberScoresRepository.findFriendScoresOnLeaderboardPage(
        [TEST_PLAYER_ID, TEST_PLAYER_TWO_ID],
        TEST_LEADERBOARD_ID,
        10,
        0
      );
      expect(rows.length).toBe(2);
    });
  });

  describe("getAverageAccuracies", () => {
    test("returns accuracy aggregates for a seeded player", async () => {
      const result = await ScoreSaberScoresRepository.getAverageAccuracies(TEST_PLAYER_ID);
      expect(result.averageAccuracy).toBeGreaterThan(0);
    });
  });

  describe("getChartRowsByPlayer", () => {
    test("returns chart rows for a seeded player", async () => {
      const rows = await ScoreSaberScoresRepository.getChartRowsByPlayer(TEST_PLAYER_ID);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("countByConditions and findRowsByConditions", () => {
    test("filters rows by player id", async () => {
      const conditions = [eq(scoreSaberScoresTable.playerId, TEST_PLAYER_ID)];
      expect(await ScoreSaberScoresRepository.countByConditions(conditions)).toBe(1);
      const rows = await ScoreSaberScoresRepository.findRowsByConditions(
        conditions,
        desc(scoreSaberScoresTable.pp),
        10,
        0
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.scoreId).toBe(TEST_SCORE_ID);
    });
  });
});
