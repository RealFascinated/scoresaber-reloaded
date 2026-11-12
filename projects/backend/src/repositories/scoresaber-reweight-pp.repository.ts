import { and, asc, count, desc, eq, gt, inArray, lt, notExists, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import {
  scoreSaberAccountsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberReweightPlayersTable,
  scoreSaberReweightScoresTable,
  scoreSaberReweightsTable,
  scoreSaberScoreRealmsTable,
  scoreSaberScoresTable,
  type ScoreSaberReweightPlayerRow,
  type ScoreSaberReweightRow,
  type ScoreSaberReweightScoreRow,
} from "../db/schema";

/** A stored score together with the pp the realm currently has stored for it (0 when it has none). */
export type StoredScorePp = {
  scoreId: number;
  playerId: string;
  leaderboardId: number;
  pp: number;
};

/** A reweight's effect on a player, joined with the player's profile. */
export type ReweightPlayerWithAccountRow = ScoreSaberReweightPlayerRow & {
  name: string;
  avatar: string;
  country: string | null;
};

/** A reweight's effect on a player's score, joined with the leaderboard identity. */
export type ReweightScoreWithLeaderboardRow = ScoreSaberReweightScoreRow & {
  songHash: string;
  songName: string;
  songSubName: string;
  songAuthorName: string;
  levelAuthorName: string;
  difficulty: (typeof scoreSaberLeaderboardsTable.$inferSelect)["difficulty"];
  characteristic: (typeof scoreSaberLeaderboardsTable.$inferSelect)["characteristic"];
};

export class ScoreSaberReweightPpRepository {
  /**
   * Reads the pp a realm has stored for scores. Scores that are not stored are left out, and
   * stored scores without a pp row have pp 0.
   *
   * @param realmId the realm to read pp for
   * @param scoreIds the scores to read
   */
  public static async selectStoredScorePps(realmId: number, scoreIds: number[]): Promise<StoredScorePp[]> {
    if (scoreIds.length === 0) {
      return [];
    }
    return db
      .select({
        scoreId: scoreSaberScoresTable.scoreId,
        playerId: scoreSaberScoresTable.playerId,
        leaderboardId: scoreSaberScoresTable.leaderboardId,
        pp: sql<number>`coalesce(${scoreSaberScoreRealmsTable.pp}, 0)`.mapWith(Number),
      })
      .from(scoreSaberScoresTable)
      .leftJoin(
        scoreSaberScoreRealmsTable,
        and(
          eq(scoreSaberScoreRealmsTable.scoreId, scoreSaberScoresTable.scoreId),
          eq(scoreSaberScoreRealmsTable.realmId, realmId)
        )
      )
      .where(inArray(scoreSaberScoresTable.scoreId, scoreIds));
  }

  /**
   * Records the pp change of scores. When a score already has a row for the reweight only its
   * `ppAfter` is updated: `ppBefore` must stay the pp stored before the reweight, even when this
   * runs again after the stored pp was already overwritten.
   */
  public static async upsertScoreChanges(rows: ScoreSaberReweightScoreRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await db
      .insert(scoreSaberReweightScoresTable)
      .values(rows)
      .onConflictDoUpdate({
        target: [scoreSaberReweightScoresTable.reweightId, scoreSaberReweightScoresTable.scoreId],
        set: { ppAfter: sql`excluded."ppAfter"` },
      });
  }

  /**
   * Replaces the pp change of players for a reweight.
   */
  public static async upsertPlayerChanges(rows: ScoreSaberReweightPlayerRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await db
      .insert(scoreSaberReweightPlayersTable)
      .values(rows)
      .onConflictDoUpdate({
        target: [scoreSaberReweightPlayersTable.reweightId, scoreSaberReweightPlayersTable.playerId],
        set: {
          ppBefore: sql`excluded."ppBefore"`,
          ppAfter: sql`excluded."ppAfter"`,
          ppDelta: sql`excluded."ppDelta"`,
          scoresChanged: sql`excluded."scoresChanged"`,
        },
      });
  }

  /**
   * Lists the players with a changed score on any of the leaderboards of a reweight.
   */
  public static async selectChangedPlayerIds(
    reweightId: number,
    leaderboardIds: number[]
  ): Promise<string[]> {
    if (leaderboardIds.length === 0) {
      return [];
    }
    const rows = await db
      .selectDistinct({ playerId: scoreSaberReweightScoresTable.playerId })
      .from(scoreSaberReweightScoresTable)
      .where(
        and(
          eq(scoreSaberReweightScoresTable.reweightId, reweightId),
          inArray(scoreSaberReweightScoresTable.leaderboardId, leaderboardIds)
        )
      );
    return rows.map(row => row.playerId);
  }

  /**
   * Lists every captured score change of the given players for a reweight.
   */
  public static async selectScoreChangesForPlayers(
    reweightId: number,
    playerIds: string[]
  ): Promise<ScoreSaberReweightScoreRow[]> {
    if (playerIds.length === 0) {
      return [];
    }
    return db
      .select()
      .from(scoreSaberReweightScoresTable)
      .where(
        and(
          eq(scoreSaberReweightScoresTable.reweightId, reweightId),
          inArray(scoreSaberReweightScoresTable.playerId, playerIds)
        )
      );
  }

  /**
   * Lists the pp of the given players' ranked scores in a realm that the reweight did not change.
   */
  public static async selectUnchangedPps(
    realmId: number,
    reweightId: number,
    playerIds: string[]
  ): Promise<{ playerId: string; pp: number }[]> {
    if (playerIds.length === 0) {
      return [];
    }
    return db
      .select({ playerId: scoreSaberScoreRealmsTable.playerId, pp: scoreSaberScoreRealmsTable.pp })
      .from(scoreSaberScoreRealmsTable)
      .where(
        and(
          eq(scoreSaberScoreRealmsTable.realmId, realmId),
          inArray(scoreSaberScoreRealmsTable.playerId, playerIds),
          notExists(
            db
              .select({ one: sql`1` })
              .from(scoreSaberReweightScoresTable)
              .where(
                and(
                  eq(scoreSaberReweightScoresTable.reweightId, reweightId),
                  eq(scoreSaberReweightScoresTable.scoreId, scoreSaberScoreRealmsTable.scoreId)
                )
              )
          )
        )
      );
  }

  /**
   * Lists the reweights that changed a player's pp, newest first.
   */
  public static async listPlayerReweights(
    playerId: string
  ): Promise<{ reweight: ScoreSaberReweightRow; change: ScoreSaberReweightPlayerRow }[]> {
    return db
      .select({ reweight: scoreSaberReweightsTable, change: scoreSaberReweightPlayersTable })
      .from(scoreSaberReweightPlayersTable)
      .innerJoin(
        scoreSaberReweightsTable,
        eq(scoreSaberReweightPlayersTable.reweightId, scoreSaberReweightsTable.id)
      )
      .where(eq(scoreSaberReweightPlayersTable.playerId, playerId))
      .orderBy(desc(scoreSaberReweightsTable.startedAt), desc(scoreSaberReweightsTable.id));
  }

  /**
   * Lists every score change of a player for a reweight, the biggest pp gain first.
   */
  public static async listPlayerScoreChanges(
    playerId: string,
    reweightId: number
  ): Promise<ReweightScoreWithLeaderboardRow[]> {
    const delta = sql`${scoreSaberReweightScoresTable.ppAfter} - ${scoreSaberReweightScoresTable.ppBefore}`;
    return db
      .select({
        ...reweightScoreColumns,
        songHash: scoreSaberLeaderboardsTable.songHash,
        songName: scoreSaberLeaderboardsTable.songName,
        songSubName: scoreSaberLeaderboardsTable.songSubName,
        songAuthorName: scoreSaberLeaderboardsTable.songAuthorName,
        levelAuthorName: scoreSaberLeaderboardsTable.levelAuthorName,
        difficulty: scoreSaberLeaderboardsTable.difficulty,
        characteristic: scoreSaberLeaderboardsTable.characteristic,
      })
      .from(scoreSaberReweightScoresTable)
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberReweightScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .where(
        and(
          eq(scoreSaberReweightScoresTable.playerId, playerId),
          eq(scoreSaberReweightScoresTable.reweightId, reweightId)
        )
      )
      .orderBy(desc(delta), asc(scoreSaberReweightScoresTable.scoreId));
  }

  /**
   * Counts the visible players a reweight changed. Banned and inactive players are left out.
   *
   * @param direction only count players who gained (`gain`) or lost (`loss`) pp
   */
  public static async countPlayers(reweightId: number, direction?: "gain" | "loss"): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(scoreSaberReweightPlayersTable)
      .innerJoin(
        scoreSaberAccountsTable,
        eq(scoreSaberReweightPlayersTable.playerId, scoreSaberAccountsTable.id)
      )
      .where(
        and(
          eq(scoreSaberReweightPlayersTable.reweightId, reweightId),
          eq(scoreSaberAccountsTable.banned, false),
          eq(scoreSaberAccountsTable.inactive, false),
          direction === undefined ? undefined : getDirectionFilter(direction)
        )
      );
    return row?.value ?? 0;
  }

  /**
   * Lists a page of the visible players a reweight changed.
   *
   * @param direction `gain` lists the players who gained pp, biggest first; `loss` those who lost pp, biggest first
   */
  public static async listPlayers(
    reweightId: number,
    direction: "gain" | "loss",
    limit: number,
    offset: number
  ): Promise<ReweightPlayerWithAccountRow[]> {
    return db
      .select({
        ...reweightPlayerColumns,
        name: scoreSaberAccountsTable.name,
        avatar: scoreSaberAccountsTable.avatar,
        country: scoreSaberAccountsTable.country,
      })
      .from(scoreSaberReweightPlayersTable)
      .innerJoin(
        scoreSaberAccountsTable,
        eq(scoreSaberReweightPlayersTable.playerId, scoreSaberAccountsTable.id)
      )
      .where(
        and(
          eq(scoreSaberReweightPlayersTable.reweightId, reweightId),
          eq(scoreSaberAccountsTable.banned, false),
          eq(scoreSaberAccountsTable.inactive, false),
          direction === undefined ? undefined : getDirectionFilter(direction)
        )
      )
      .orderBy(
        direction === "gain"
          ? desc(scoreSaberReweightPlayersTable.ppDelta)
          : asc(scoreSaberReweightPlayersTable.ppDelta),
        asc(scoreSaberReweightPlayersTable.playerId)
      )
      .limit(limit)
      .offset(offset);
  }
}

const reweightScoreColumns = {
  reweightId: scoreSaberReweightScoresTable.reweightId,
  scoreId: scoreSaberReweightScoresTable.scoreId,
  playerId: scoreSaberReweightScoresTable.playerId,
  leaderboardId: scoreSaberReweightScoresTable.leaderboardId,
  ppBefore: scoreSaberReweightScoresTable.ppBefore,
  ppAfter: scoreSaberReweightScoresTable.ppAfter,
};

const reweightPlayerColumns = {
  reweightId: scoreSaberReweightPlayersTable.reweightId,
  playerId: scoreSaberReweightPlayersTable.playerId,
  ppBefore: scoreSaberReweightPlayersTable.ppBefore,
  ppAfter: scoreSaberReweightPlayersTable.ppAfter,
  ppDelta: scoreSaberReweightPlayersTable.ppDelta,
  scoresChanged: scoreSaberReweightPlayersTable.scoresChanged,
};

function getDirectionFilter(direction: "gain" | "loss"): SQL {
  return direction === "gain"
    ? gt(scoreSaberReweightPlayersTable.ppDelta, 0)
    : lt(scoreSaberReweightPlayersTable.ppDelta, 0);
}
