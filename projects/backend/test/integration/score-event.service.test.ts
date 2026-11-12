import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "../../src/db";
import { ScoreEventService } from "../../src/service/score-event/score-event.service";
import { TEST_LEADERBOARD_ID, TEST_PLAYER_ID } from "../helpers/constants";
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

describe("ScoreEventService.purgeOldEvents", () => {
  async function insertEvents(daysAgo: number, count: number): Promise<void> {
    await db.execute(sql`
      INSERT INTO "scoresaber-score-events" ("playerId", "leaderboardId", "timestamp")
      SELECT ${TEST_PLAYER_ID}, ${TEST_LEADERBOARD_ID}, now() - (${daysAgo} * interval '1 day') - (g * interval '1 second')
      FROM generate_series(1, ${count}) AS g
    `);
  }

  async function countEvents(): Promise<number> {
    const result = await db.execute(sql`SELECT count(*)::int AS count FROM "scoresaber-score-events"`);
    return Number(result.rows[0].count);
  }

  test("deletes events past the retention window and keeps the rest", async () => {
    await db.execute(sql`DELETE FROM "scoresaber-score-events"`);
    await insertEvents(30, 120);
    await insertEvents(9, 40);
    await insertEvents(1, 70);

    expect(await ScoreEventService.purgeOldEvents()).toBe(160);
    expect(await countEvents()).toBe(70);

    const oldest = await db.execute(sql`SELECT min("timestamp") AS oldest FROM "scoresaber-score-events"`);
    expect(new Date(oldest.rows[0].oldest as string).getTime()).toBeGreaterThan(Date.now() - 2 * 86_400_000);
  });

  test("deletes nothing when every event is recent", async () => {
    await db.execute(sql`DELETE FROM "scoresaber-score-events"`);
    await insertEvents(2, 25);
    expect(await ScoreEventService.purgeOldEvents()).toBe(0);
    expect(await countEvents()).toBe(25);
  });
});
