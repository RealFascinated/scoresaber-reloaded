import { and, asc, count, desc, eq, gt, inArray, lt, notExists, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import {
  scoreSaberAccountsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberRankedBatchPlayersTable,
  scoreSaberRankedBatchScoresTable,
  scoreSaberRankedBatchesTable,
  scoreSaberScoreRealmsTable,
  scoreSaberScoresTable,
  type ScoreSaberRankedBatchPlayerRow,
  type ScoreSaberRankedBatchRow,
  type ScoreSaberRankedBatchScoreRow,
} from "../db/schema";

/** A stored score together with the pp the realm currently has stored for it (0 when it has none). */
export type StoredScorePp = {
  scoreId: number;
  playerId: string;
  leaderboardId: number;
  pp: number;
};

/** A ranked batch's effect on a player, joined with the player's profile. */
export type RankedBatchPlayerWithAccountRow = ScoreSaberRankedBatchPlayerRow & {
  name: string;
  avatar: string;
  country: string | null;
};

/** A ranked batch's effect on a player's score, joined with the leaderboard identity. */
export type RankedBatchScoreWithLeaderboardRow = ScoreSaberRankedBatchScoreRow & {
  songHash: string;
  songName: string;
  songSubName: string;
  songAuthorName: string;
  levelAuthorName: string;
  difficulty: (typeof scoreSaberLeaderboardsTable.$inferSelect)["difficulty"];
  characteristic: (typeof scoreSaberLeaderboardsTable.$inferSelect)["characteristic"];
};

export class ScoreSaberRankedBatchPpRepository {
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
   * Records the pp change of scores. When a score already has a row for the ranked batch only its
   * `ppAfter` is updated: `ppBefore` must stay the pp stored before the ranked batch, even when this
   * runs again after the stored pp was already overwritten.
   */
  public static async upsertScoreChanges(rows: ScoreSaberRankedBatchScoreRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await db
      .insert(scoreSaberRankedBatchScoresTable)
      .values(rows)
      .onConflictDoUpdate({
        target: [scoreSaberRankedBatchScoresTable.rankedBatchId, scoreSaberRankedBatchScoresTable.scoreId],
        set: { ppAfter: sql`excluded."ppAfter"` },
      });
  }

  /**
   * Replaces the pp change of players for a ranked batch.
   */
  public static async upsertPlayerChanges(rows: ScoreSaberRankedBatchPlayerRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await db
      .insert(scoreSaberRankedBatchPlayersTable)
      .values(rows)
      .onConflictDoUpdate({
        target: [scoreSaberRankedBatchPlayersTable.rankedBatchId, scoreSaberRankedBatchPlayersTable.playerId],
        set: {
          ppBefore: sql`excluded."ppBefore"`,
          ppAfter: sql`excluded."ppAfter"`,
          ppDelta: sql`excluded."ppDelta"`,
          scoresChanged: sql`excluded."scoresChanged"`,
        },
      });
  }

  /**
   * Lists the players with a changed score on any of the leaderboards of a ranked batch.
   */
  public static async selectChangedPlayerIds(
    rankedBatchId: number,
    leaderboardIds: number[]
  ): Promise<string[]> {
    if (leaderboardIds.length === 0) {
      return [];
    }
    const rows = await db
      .selectDistinct({ playerId: scoreSaberRankedBatchScoresTable.playerId })
      .from(scoreSaberRankedBatchScoresTable)
      .where(
        and(
          eq(scoreSaberRankedBatchScoresTable.rankedBatchId, rankedBatchId),
          inArray(scoreSaberRankedBatchScoresTable.leaderboardId, leaderboardIds)
        )
      );
    return rows.map(row => row.playerId);
  }

  /**
   * Lists every captured score change of the given players for a ranked batch.
   */
  public static async selectScoreChangesForPlayers(
    rankedBatchId: number,
    playerIds: string[]
  ): Promise<ScoreSaberRankedBatchScoreRow[]> {
    if (playerIds.length === 0) {
      return [];
    }
    return db
      .select()
      .from(scoreSaberRankedBatchScoresTable)
      .where(
        and(
          eq(scoreSaberRankedBatchScoresTable.rankedBatchId, rankedBatchId),
          inArray(scoreSaberRankedBatchScoresTable.playerId, playerIds)
        )
      );
  }

  /**
   * Lists the pp of the given players' ranked scores in a realm that the ranked batch did not change.
   */
  public static async selectUnchangedPps(
    realmId: number,
    rankedBatchId: number,
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
              .from(scoreSaberRankedBatchScoresTable)
              .where(
                and(
                  eq(scoreSaberRankedBatchScoresTable.rankedBatchId, rankedBatchId),
                  eq(scoreSaberRankedBatchScoresTable.scoreId, scoreSaberScoreRealmsTable.scoreId)
                )
              )
          )
        )
      );
  }

  /**
   * Lists the ranked batches that changed a player's pp, newest first.
   */
  public static async listPlayerRankedBatches(
    playerId: string
  ): Promise<{ rankedBatch: ScoreSaberRankedBatchRow; change: ScoreSaberRankedBatchPlayerRow }[]> {
    return db
      .select({ rankedBatch: scoreSaberRankedBatchesTable, change: scoreSaberRankedBatchPlayersTable })
      .from(scoreSaberRankedBatchPlayersTable)
      .innerJoin(
        scoreSaberRankedBatchesTable,
        eq(scoreSaberRankedBatchPlayersTable.rankedBatchId, scoreSaberRankedBatchesTable.id)
      )
      .where(eq(scoreSaberRankedBatchPlayersTable.playerId, playerId))
      .orderBy(desc(scoreSaberRankedBatchesTable.startedAt), desc(scoreSaberRankedBatchesTable.id));
  }

  /**
   * Lists every score change of a player for a ranked batch, the biggest pp gain first.
   */
  public static async listPlayerScoreChanges(
    playerId: string,
    rankedBatchId: number
  ): Promise<RankedBatchScoreWithLeaderboardRow[]> {
    const delta = sql`${scoreSaberRankedBatchScoresTable.ppAfter} - ${scoreSaberRankedBatchScoresTable.ppBefore}`;
    return db
      .select({
        ...rankedBatchScoreColumns,
        songHash: scoreSaberLeaderboardsTable.songHash,
        songName: scoreSaberLeaderboardsTable.songName,
        songSubName: scoreSaberLeaderboardsTable.songSubName,
        songAuthorName: scoreSaberLeaderboardsTable.songAuthorName,
        levelAuthorName: scoreSaberLeaderboardsTable.levelAuthorName,
        difficulty: scoreSaberLeaderboardsTable.difficulty,
        characteristic: scoreSaberLeaderboardsTable.characteristic,
      })
      .from(scoreSaberRankedBatchScoresTable)
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberRankedBatchScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .where(
        and(
          eq(scoreSaberRankedBatchScoresTable.playerId, playerId),
          eq(scoreSaberRankedBatchScoresTable.rankedBatchId, rankedBatchId)
        )
      )
      .orderBy(desc(delta), asc(scoreSaberRankedBatchScoresTable.scoreId));
  }

  /**
   * Counts the visible players a ranked batch changed. Banned and inactive players are left out.
   *
   * @param direction only count players who gained (`gain`) or lost (`loss`) pp
   */
  public static async countPlayers(rankedBatchId: number, direction?: "gain" | "loss"): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(scoreSaberRankedBatchPlayersTable)
      .innerJoin(
        scoreSaberAccountsTable,
        eq(scoreSaberRankedBatchPlayersTable.playerId, scoreSaberAccountsTable.id)
      )
      .where(
        and(
          eq(scoreSaberRankedBatchPlayersTable.rankedBatchId, rankedBatchId),
          eq(scoreSaberAccountsTable.banned, false),
          eq(scoreSaberAccountsTable.inactive, false),
          direction === undefined ? undefined : getDirectionFilter(direction)
        )
      );
    return row?.value ?? 0;
  }

  /**
   * Lists a page of the visible players a ranked batch changed.
   *
   * @param direction `gain` lists the players who gained pp, biggest first; `loss` those who lost pp, biggest first
   */
  public static async listPlayers(
    rankedBatchId: number,
    direction: "gain" | "loss",
    limit: number,
    offset: number
  ): Promise<RankedBatchPlayerWithAccountRow[]> {
    return db
      .select({
        ...rankedBatchPlayerColumns,
        name: scoreSaberAccountsTable.name,
        avatar: scoreSaberAccountsTable.avatar,
        country: scoreSaberAccountsTable.country,
      })
      .from(scoreSaberRankedBatchPlayersTable)
      .innerJoin(
        scoreSaberAccountsTable,
        eq(scoreSaberRankedBatchPlayersTable.playerId, scoreSaberAccountsTable.id)
      )
      .where(
        and(
          eq(scoreSaberRankedBatchPlayersTable.rankedBatchId, rankedBatchId),
          eq(scoreSaberAccountsTable.banned, false),
          eq(scoreSaberAccountsTable.inactive, false),
          direction === undefined ? undefined : getDirectionFilter(direction)
        )
      )
      .orderBy(
        direction === "gain"
          ? desc(scoreSaberRankedBatchPlayersTable.ppDelta)
          : asc(scoreSaberRankedBatchPlayersTable.ppDelta),
        asc(scoreSaberRankedBatchPlayersTable.playerId)
      )
      .limit(limit)
      .offset(offset);
  }
}

const rankedBatchScoreColumns = {
  rankedBatchId: scoreSaberRankedBatchScoresTable.rankedBatchId,
  scoreId: scoreSaberRankedBatchScoresTable.scoreId,
  playerId: scoreSaberRankedBatchScoresTable.playerId,
  leaderboardId: scoreSaberRankedBatchScoresTable.leaderboardId,
  ppBefore: scoreSaberRankedBatchScoresTable.ppBefore,
  ppAfter: scoreSaberRankedBatchScoresTable.ppAfter,
};

const rankedBatchPlayerColumns = {
  rankedBatchId: scoreSaberRankedBatchPlayersTable.rankedBatchId,
  playerId: scoreSaberRankedBatchPlayersTable.playerId,
  ppBefore: scoreSaberRankedBatchPlayersTable.ppBefore,
  ppAfter: scoreSaberRankedBatchPlayersTable.ppAfter,
  ppDelta: scoreSaberRankedBatchPlayersTable.ppDelta,
  scoresChanged: scoreSaberRankedBatchPlayersTable.scoresChanged,
};

function getDirectionFilter(direction: "gain" | "loss"): SQL {
  return direction === "gain"
    ? gt(scoreSaberRankedBatchPlayersTable.ppDelta, 0)
    : lt(scoreSaberRankedBatchPlayersTable.ppDelta, 0);
}
