import { describe, expect, test } from "bun:test";
import { leaderboardRowToType } from "../../src/db/converter/scoresaber-leaderboard";
import { scoreSaberScoreRowToType } from "../../src/db/converter/scoresaber-score";
import { ScoreSaberScoresRepository } from "../../src/repositories/scoresaber-scores.repository";
import { ScoreCoreService } from "../../src/service/score/score-core.service";
import {
  TEST_INACTIVE_PLAYER_ID,
  TEST_LEADERBOARD_ID,
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_PLAYER_ID,
  TEST_SCORE_ID,
} from "../helpers/constants";
import { buildLeaderboardRow, buildScoreRow } from "../helpers/fixtures";

const NEW_SCORE_ID = 900_999;

describe("ScoreCoreService", () => {
  describe("toInsertRow", () => {
    test("maps score fields for database insert", () => {
      const row = buildScoreRow({ scoreId: 900_050, score: 880, pp: 180 });
      const score = scoreSaberScoreRowToType(row);
      const insertRow = ScoreCoreService.toInsertRow(score);

      expect(insertRow.scoreId).toBe(900_050);
      expect(insertRow.playerId).toBe(TEST_PLAYER_ID);
      expect(insertRow.leaderboardId).toBe(TEST_LEADERBOARD_ID);
      expect(insertRow.score).toBe(880);
      expect(insertRow.pp).toBe(180);
      expect(insertRow.modifiers).toBeNull();
    });
  });

  describe("trackScoreSaberScore", () => {
    test("returns tracked false for an existing score id and value", async () => {
      const row = buildScoreRow();
      const score = scoreSaberScoreRowToType(row);
      const leaderboard = leaderboardRowToType(buildLeaderboardRow());

      const result = await ScoreCoreService.trackScoreSaberScore(score, leaderboard);

      expect(result.tracked).toBe(false);
      expect(result.score).toBeUndefined();
    });

    test("inserts a new score when score id is unused", async () => {
      const row = buildScoreRow({
        scoreId: NEW_SCORE_ID,
        score: 870,
        pp: 170,
        timestamp: new Date("2024-07-02T00:00:00.000Z"),
      });
      const score = scoreSaberScoreRowToType(row);
      const leaderboard = leaderboardRowToType(buildLeaderboardRow());

      const result = await ScoreCoreService.trackScoreSaberScore(score, leaderboard, false, undefined, {
        skipDuplicateCheck: true,
      });

      expect(result.tracked).toBe(true);
      expect(result.score?.scoreId).toBe(NEW_SCORE_ID);
      expect(await ScoreSaberScoresRepository.rowExistsByScoreId(NEW_SCORE_ID)).toBe(true);
    });
  });

  describe("upsertScoresFromApi", () => {
    test("deduplicates repeated score ids in a single batch", async () => {
      const row = buildScoreRow({
        scoreId: 900_060,
        playerId: TEST_INACTIVE_PLAYER_ID,
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        pp: 120,
      });
      const score = scoreSaberScoreRowToType(row);

      await ScoreCoreService.upsertScoresFromApi([score, score, score]);

      expect(await ScoreSaberScoresRepository.rowExistsByScoreId(900_060)).toBe(true);
      expect(await ScoreSaberScoresRepository.findRowByScoreId(TEST_SCORE_ID)).toBeDefined();
    });
  });
});
