import { describe, expect, test } from "bun:test";
import { scoreSaberScoreRowToType } from "../../src/db/converter/scoresaber-score";
import { TopScoresService } from "../../src/service/score/top-scores.service";
import { TEST_SCORE_ID } from "../helpers/constants";
import { buildScoreRow } from "../helpers/fixtures";

describe("TopScoresService", () => {
  describe("getTopScores", () => {
    test("returns paginated top scores including the seeded score", async () => {
      const page = await TopScoresService.getTopScores(1, 25);

      expect(page.metadata.page).toBe(1);
      expect(page.metadata.totalItems).toBeGreaterThanOrEqual(1);
      expect(page.items.length).toBeGreaterThanOrEqual(1);
      expect(page.items.some(entry => entry.score.scoreId === TEST_SCORE_ID)).toBe(true);
      expect(page.items[0]?.leaderboard).toBeDefined();
    });
  });

  describe("isTop50GlobalScore", () => {
    test("returns false when pp is zero", async () => {
      const score = scoreSaberScoreRowToType(buildScoreRow({ pp: 0 }));
      score.rank = 1;
      expect(await TopScoresService.isTop50GlobalScore(score)).toBe(false);
    });

    test("returns false when rank is 10 or higher", async () => {
      const score = scoreSaberScoreRowToType(buildScoreRow({ pp: 300 }));
      score.rank = 10;
      expect(await TopScoresService.isTop50GlobalScore(score)).toBe(false);
    });

    test("returns true for a high-pp low-rank score in the seeded dataset", async () => {
      const score = scoreSaberScoreRowToType(buildScoreRow({ pp: 250 }));
      score.rank = 1;
      expect(await TopScoresService.isTop50GlobalScore(score)).toBe(true);
    });
  });
});
