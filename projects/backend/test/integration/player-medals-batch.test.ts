import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { describe, expect, test } from "bun:test";
import { asc, inArray, sql } from "drizzle-orm";
import { db } from "../../src/db";
import {
  scoreSaberAccountsTable,
  scoreSaberLeaderboardRealmsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberScoresTable,
} from "../../src/db/schema";
import { ScoreSaberLeaderboardsRepository } from "../../src/repositories/scoresaber-leaderboards.repository";
import { PlayerMedalsService } from "../../src/service/medals/player-medals.service";
import { TEST_AVATAR } from "../helpers/constants";

const LEADERBOARD_COUNT = 12;
const PLAYER_COUNT = 15;
const FIRST_LEADERBOARD_ID = 910_000;
const playerId = (index: number) => `9100000000000000000000000000${String(index).padStart(4, "0")}`;

async function seedMedalScenario() {
  const now = new Date();
  const leaderboardIds = Array.from({ length: LEADERBOARD_COUNT }, (_, i) => FIRST_LEADERBOARD_ID + i);

  await db.insert(scoreSaberAccountsTable).values(
    Array.from({ length: PLAYER_COUNT }, (_, i) => ({
      id: playerId(i),
      name: `Medal Player ${i}`,
      country: "US",
      avatar: TEST_AVATAR,
      seededScores: true,
      seededBeatLeaderScores: true,
      trackReplays: false,
      inactive: false,
      banned: i % 7 === 3,
      pp: 100,
      medals: 3,
      trackedSince: now,
      joinedDate: now,
    }))
  );

  await db.insert(scoreSaberLeaderboardsTable).values(
    leaderboardIds.map(id => ({
      id,
      songHash: id.toString(16).padStart(32, "0"),
      songName: `Medal Song ${id}`,
      songSubName: "",
      songAuthorName: "Author",
      levelAuthorName: "Mapper",
      difficulty: "ExpertPlus" as const,
      characteristic: "Standard" as const,
      maxScore: 1000,
      plays: 0,
      dailyPlays: 0,
      seededScores: true,
      trendingScore: 1,
      timestamp: now,
    }))
  );

  await db.insert(scoreSaberLeaderboardRealmsTable).values(
    leaderboardIds.map((id, index) => ({
      leaderboardId: id,
      realmId: DEFAULT_REALM_ID,
      ranked: index % 4 !== 3,
      qualified: index % 4 === 3,
      stars: 5 + index / 10,
      rankedDate: now,
    }))
  );

  await db.insert(scoreSaberScoresTable).values(
    leaderboardIds.flatMap((leaderboardId, lbIndex) =>
      Array.from({ length: PLAYER_COUNT }, (_, p) => ({
        scoreId: leaderboardId * 100 + p,
        playerId: playerId(p),
        leaderboardId,
        difficulty: "ExpertPlus" as const,
        characteristic: "Standard" as const,
        score: 1000 + ((p * 37 + lbIndex * 11) % 97) * 10 + p,
        accuracy: 0.9,
        medals: (leaderboardId * 100 + p) % 3,
        missedNotes: 0,
        badCuts: 0,
        maxCombo: 500,
        fullCombo: false,
        modifiers: [],
        timestamp: now,
      }))
    )
  );

  return leaderboardIds;
}

async function resetMedals(leaderboardIds: number[]) {
  await db.update(scoreSaberAccountsTable).set({ medals: 3 });
  await db.execute(
    sql`UPDATE "scoresaber-scores" SET medals = "scoreId" % 3 WHERE "leaderboardId" IN (${sql.join(
      leaderboardIds.map(id => sql`${id}`),
      sql`, `
    )})`
  );
}

async function readMedals(leaderboardIds: number[]) {
  const [scores, accounts] = await Promise.all([
    db
      .select({ scoreId: scoreSaberScoresTable.scoreId, medals: scoreSaberScoresTable.medals })
      .from(scoreSaberScoresTable)
      .where(inArray(scoreSaberScoresTable.leaderboardId, leaderboardIds))
      .orderBy(asc(scoreSaberScoresTable.scoreId)),
    db
      .select({ id: scoreSaberAccountsTable.id, medals: scoreSaberAccountsTable.medals })
      .from(scoreSaberAccountsTable)
      .where(
        inArray(
          scoreSaberAccountsTable.id,
          Array.from({ length: PLAYER_COUNT }, (_, i) => playerId(i))
        )
      )
      .orderBy(asc(scoreSaberAccountsTable.id)),
  ]);
  return { scores, accounts };
}

describe("PlayerMedalsService.refreshLeaderboardsMedals", () => {
  test("leaves the same score and account medals as refreshing each leaderboard on its own", async () => {
    const leaderboardIds = await seedMedalScenario();
    const leaderboards = await ScoreSaberLeaderboardsRepository.getLeaderboardsByIds(
      leaderboardIds,
      true,
      DEFAULT_REALM_ID
    );
    expect(leaderboards).toHaveLength(LEADERBOARD_COUNT);

    for (const leaderboard of leaderboards) {
      await PlayerMedalsService.refreshLeaderboardMedals(leaderboard);
    }
    const sequential = await readMedals(leaderboardIds);

    expect(sequential.scores.some(score => score.medals > 0)).toBe(true);
    expect(sequential.accounts.some(account => account.medals !== 3)).toBe(true);

    await resetMedals(leaderboardIds);
    await PlayerMedalsService.refreshLeaderboardsMedals(leaderboards);
    const batched = await readMedals(leaderboardIds);

    expect(batched.scores).toEqual(sequential.scores);
    expect(batched.accounts).toEqual(sequential.accounts);
  });

  test("does nothing for an empty list or only unranked leaderboards", async () => {
    await PlayerMedalsService.refreshLeaderboardsMedals([]);
  });
});
