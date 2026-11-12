import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "../../src/db";
import { ScoreEventService } from "../../src/service/score-event/score-event.service";
import {
  readTrendingScores,
  seedTrendingScenario,
  TRENDING_LEADERBOARDS,
} from "../helpers/trending-scenario";

describe("ScoreEventService.updateTrendingLeaderboards", () => {
  async function scoresByKey(): Promise<Record<keyof typeof TRENDING_LEADERBOARDS, number>> {
    await seedTrendingScenario();
    await ScoreEventService.updateTrendingLeaderboards();
    const scores = await readTrendingScores();
    const byName = new Map(scores.map(entry => [entry.name, entry.score]));
    return {
      evergreen: byName.get(TRENDING_LEADERBOARDS.evergreen.name) ?? 0,
      breakout: byName.get(TRENDING_LEADERBOARDS.breakout.name) ?? 0,
      fading: byName.get(TRENDING_LEADERBOARDS.fading.name) ?? 0,
      grinder: byName.get(TRENDING_LEADERBOARDS.grinder.name) ?? 0,
      newMap: byName.get(TRENDING_LEADERBOARDS.newMap.name) ?? 0,
    };
  }

  test("ranks a map that is taking off above a steady evergreen map", async () => {
    const scores = await scoresByKey();
    expect(scores.breakout).toBeGreaterThan(scores.evergreen);
  });

  test("ranks a map that already peaked below steady and growing maps", async () => {
    const scores = await scoresByKey();
    expect(scores.fading).toBeLessThan(scores.evergreen);
    expect(scores.fading).toBeLessThan(scores.newMap);
  });

  test("does not let a few players replaying one map outrank real audiences", async () => {
    const scores = await scoresByKey();
    expect(scores.grinder).toBeLessThan(scores.evergreen);
    expect(scores.grinder).toBeLessThan(scores.newMap);
  });

  test("a tiny new map does not beat an established one on ratio alone", async () => {
    const scores = await scoresByKey();
    expect(scores.newMap).toBeLessThan(scores.evergreen);
  });

  test("resets the score of maps with no activity in the last week", async () => {
    await seedTrendingScenario();
    await ScoreEventService.updateTrendingLeaderboards();
    await db.execute(sql`DELETE FROM "scoresaber-score-events"`);
    await ScoreEventService.updateTrendingLeaderboards();
    const scores = await readTrendingScores();
    expect(scores.every(entry => entry.score === 0)).toBe(true);
  });
});
