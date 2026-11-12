import { inArray } from "drizzle-orm";
import { db } from "../../src/db";
import {
  scoreSaberAccountsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberScoreEventTable,
} from "../../src/db/schema";

export const TRENDING_LEADERBOARDS = {
  evergreen: { id: 9001, name: "Evergreen classic" },
  breakout: { id: 9002, name: "Breakout hit" },
  fading: { id: 9003, name: "Fading hit" },
  grinder: { id: 9004, name: "Grinder-farmed" },
  newMap: { id: 9005, name: "Brand new, small" },
} as const;

const PLAYER_POOL_SIZE = 500;
const HOUR_MS = 3_600_000;

type EventRow = typeof scoreSaberScoreEventTable.$inferInsert;

/**
 * Seeds five leaderboards whose last-7-day activity has a distinct shape:
 * - evergreen: 60 new players every day
 * - breakout: 3/day for five days, then 40/day over the last two
 * - fading: 80/day on days 6-5 ago, then 2/day
 * - grinder: 3 players replaying 400 times each today
 * - newMap: 10 players today
 */
export async function seedTrendingScenario(): Promise<void> {
  const now = new Date();
  const playerIds = Array.from({ length: PLAYER_POOL_SIZE }, (_, i) => `trend-player-${i}`);

  await db.insert(scoreSaberAccountsTable).values(
    playerIds.map(id => ({
      id,
      name: id,
      country: "US",
      avatar: "https://example.com/avatar.png",
      seededScores: true,
      seededBeatLeaderScores: true,
      trackReplays: false,
      inactive: false,
      banned: false,
      pp: 0,
      medals: 0,
      trackedSince: now,
      joinedDate: now,
    }))
  );

  await db.insert(scoreSaberLeaderboardsTable).values(
    Object.values(TRENDING_LEADERBOARDS).map(({ id, name }) => ({
      id,
      songHash: `TRENDHASH${id}`,
      songName: name,
      songSubName: "",
      songAuthorName: "Author",
      levelAuthorName: "Mapper",
      difficulty: "ExpertPlus" as const,
      characteristic: "Standard" as const,
      maxScore: 1000,
      plays: 0,
      dailyPlays: 0,
      seededScores: true,
      trendingScore: 0,
      timestamp: now,
    }))
  );

  const events: EventRow[] = [];
  /** `count` distinct players play on `daysAgo` (midday of that day). */
  const playersOnDay = (leaderboardId: number, daysAgo: number, count: number, offset: number): void => {
    for (let i = 0; i < count; i++) {
      events.push({
        playerId: playerIds[(offset + i) % PLAYER_POOL_SIZE],
        leaderboardId,
        timestamp: new Date(now.getTime() - (daysAgo * 24 + 12) * HOUR_MS),
      });
    }
  };

  for (let day = 0; day < 7; day++) {
    playersOnDay(TRENDING_LEADERBOARDS.evergreen.id, day, 60, day * 60);
  }
  for (let day = 6; day >= 2; day--) {
    playersOnDay(TRENDING_LEADERBOARDS.breakout.id, day, 3, day * 3);
  }
  for (let day = 1; day >= 0; day--) {
    playersOnDay(TRENDING_LEADERBOARDS.breakout.id, day, 40, 100 + day * 40);
  }
  for (let day = 6; day >= 5; day--) {
    playersOnDay(TRENDING_LEADERBOARDS.fading.id, day, 80, day * 80);
  }
  for (let day = 4; day >= 0; day--) {
    playersOnDay(TRENDING_LEADERBOARDS.fading.id, day, 2, 10 + day * 2);
  }
  for (let player = 0; player < 3; player++) {
    for (let play = 0; play < 400; play++) {
      events.push({
        playerId: playerIds[player],
        leaderboardId: TRENDING_LEADERBOARDS.grinder.id,
        timestamp: new Date(now.getTime() - (play % 20) * HOUR_MS - 1000),
      });
    }
  }
  playersOnDay(TRENDING_LEADERBOARDS.newMap.id, 0, 10, 200);

  for (let i = 0; i < events.length; i += 2000) {
    await db.insert(scoreSaberScoreEventTable).values(events.slice(i, i + 2000));
  }
}

export async function readTrendingScores(): Promise<{ name: string; score: number }[]> {
  const ids = Object.values(TRENDING_LEADERBOARDS).map(l => l.id);
  const rows = await db
    .select({ id: scoreSaberLeaderboardsTable.id, score: scoreSaberLeaderboardsTable.trendingScore })
    .from(scoreSaberLeaderboardsTable)
    .where(inArray(scoreSaberLeaderboardsTable.id, ids));

  return Object.values(TRENDING_LEADERBOARDS)
    .map(({ id, name }) => ({ name, score: rows.find(row => row.id === id)?.score ?? 0 }))
    .sort((a, b) => b.score - a.score);
}
