import type { AnyColumn, SQL } from "drizzle-orm";
import { and, eq, getTableColumns, sql } from "drizzle-orm";
import type { alias } from "drizzle-orm/pg-core";
import {
  scoreSaberLeaderboardRealmsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberScoreRealmsTable,
  scoreSaberScoresTable,
} from "../db/schema";

type LeaderboardTable = typeof scoreSaberLeaderboardsTable;
type LeaderboardRealmTable = typeof scoreSaberLeaderboardRealmsTable;
type LeaderboardTableOrAlias = LeaderboardTable | ReturnType<typeof alias<LeaderboardTable, string>>;
type LeaderboardRealmTableOrAlias =
  LeaderboardRealmTable | ReturnType<typeof alias<LeaderboardRealmTable, string>>;

/**
 * The pp of a score in the realm joined through {@link scoreRealmJoinOn} (0 when the
 * score has no pp row in that realm, i.e. it is unranked there).
 */
export const scorePpExpr = sql<number>`coalesce(${scoreSaberScoreRealmsTable.pp}, 0)`.mapWith(Number);

/**
 * The columns of a score row resolved for the realm joined through {@link scoreRealmJoinOn}.
 */
export function resolvedScoreColumns() {
  return {
    ...getTableColumns(scoreSaberScoresTable),
    pp: scorePpExpr.as("pp"),
  };
}

/**
 * Join condition that attaches a realm's pp row to the scores table. Use with `leftJoin`
 * (every score is returned, unranked ones get pp 0) or `innerJoin` (ranked scores only).
 *
 * @param realmId the realm to resolve pp for
 */
export function scoreRealmJoinOn(realmId: number): SQL {
  return and(
    eq(scoreSaberScoreRealmsTable.scoreId, scoreSaberScoresTable.scoreId),
    eq(scoreSaberScoreRealmsTable.realmId, realmId),
    // Redundant for correctness (the realm row copies its score's player), but it lets the planner
    // use the (realmId, playerId, pp) index when a player is filtered. Without it, a heavy player's
    // aggregate hash-joins against a scan of the whole score-realms table.
    eq(scoreSaberScoreRealmsTable.playerId, scoreSaberScoresTable.playerId)
  ) as SQL;
}

/**
 * Join condition that attaches a realm's ranking row to a leaderboard table (or alias).
 *
 * @param leaderboard the leaderboard table or alias
 * @param leaderboardRealm the leaderboard-realm table or alias
 * @param realmId the realm to resolve ranking state for
 */
export function leaderboardRealmJoinOn(
  leaderboard: { id: AnyColumn },
  leaderboardRealm: { leaderboardId: AnyColumn; realmId: AnyColumn },
  realmId: number
): SQL {
  return and(
    eq(leaderboardRealm.leaderboardId, leaderboard.id),
    eq(leaderboardRealm.realmId, realmId)
  ) as SQL;
}

/**
 * The columns of a leaderboard row resolved for a realm: the base columns plus the realm's
 * ranking state, defaulting to unranked with 0 stars when the leaderboard has no row.
 *
 * @param leaderboard the leaderboard table or alias
 * @param leaderboardRealm the leaderboard-realm table or alias joined for the realm
 */
export function resolvedLeaderboardColumns(
  leaderboard: LeaderboardTableOrAlias = scoreSaberLeaderboardsTable,
  leaderboardRealm: LeaderboardRealmTableOrAlias = scoreSaberLeaderboardRealmsTable
) {
  // An alias exposes the same columns under another table name, so the base table's column types apply.
  // The generated full-text search document is only ever used inside WHERE / ORDER BY, so it is left
  // out of the selected columns instead of being transferred with every row.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { searchVector: _searchVector, ...leaderboardColumns } = getTableColumns(leaderboard) as ReturnType<
    typeof getTableColumns<LeaderboardTable>
  >;
  return {
    ...leaderboardColumns,
    ranked: sql<boolean>`coalesce(${(leaderboardRealm as LeaderboardRealmTable).ranked}, false)`.mapWith(
      Boolean
    ),
    qualified: sql<boolean>`coalesce(${leaderboardRealm.qualified}, false)`.mapWith(Boolean),
    stars: sql<number>`coalesce(${leaderboardRealm.stars}, 0)`.mapWith(Number),
    rankedDate: leaderboardRealm.rankedDate as LeaderboardRealmTable["rankedDate"],
    qualifiedDate: leaderboardRealm.qualifiedDate as LeaderboardRealmTable["qualifiedDate"],
  };
}
