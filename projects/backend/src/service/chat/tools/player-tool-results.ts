import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberPlayerHistory } from "@ssr/common/schemas/scoresaber/player/history";
import type { ScoreSaberPlayerStatistics } from "@ssr/common/schemas/scoresaber/player/statistics";
import type { ChatToolContext } from "../chat-tool-context";

import { MAX_TOOL_ROWS } from "./map-tool-utils";

export { MAX_TOOL_ROWS };

type PlayerSummarySource = Pick<
  ScoreSaberPlayer,
  | "id"
  | "name"
  | "country"
  | "rank"
  | "countryRank"
  | "pp"
  | "medals"
  | "medalsRank"
  | "medalsCountryRank"
  | "inactive"
  | "banned"
>;

type PlayerProfileSource = PlayerSummarySource & {
  joinedDate: Date;
  trackedSince: Date;
  topPp?: number;
  statistics: Pick<
    ScoreSaberPlayerStatistics,
    "averageRankedAccuracy" | "rankedScores" | "unrankedScores" | "totalScores"
  >;
};

type LeaderboardSource = Pick<
  ScoreSaberLeaderboard,
  "id" | "songName" | "songAuthorName" | "difficulty" | "stars" | "ranked"
>;

type TrimmableScore = {
  scoreId: number;
  accuracy: number;
  score: number;
  misses: number;
  maxCombo: number;
  fullCombo: boolean;
  timestamp: Date;
  pp?: number;
  medals?: number;
};

type PlayerScoreSource<TScore extends TrimmableScore> = {
  score: TScore;
  leaderboard: LeaderboardSource;
};

function isPrecisionLossOf(requested: string, linkedPlayerId: string | null) {
  return (
    linkedPlayerId !== null &&
    requested !== linkedPlayerId &&
    requested.length > 15 &&
    Number(requested) === Number(linkedPlayerId)
  );
}

/**
 * Resolves the player a tool should read, falling back to the signed-in user's linked player.
 * Returns an error telling the model to ask for a player id or name when neither exists.
 */
export function resolvePlayerId(context: ChatToolContext, playerId?: string) {
  const requested = playerId?.trim();
  const resolved =
    requested && !isPrecisionLossOf(requested, context.playerId) ? requested : context.playerId;
  if (!resolved) {
    return {
      ok: false as const,
      code: "invalid_input" as const,
      error:
        "No player id was provided and this account has no linked player. Ask the user for a player id or name, then use searchPlayers to find the id.",
    };
  }
  return { ok: true as const, playerId: resolved };
}

/**
 * Caps a list result to the maximum number of rows a tool returns.
 */
export function capRows<T>(rows: T[]) {
  return rows.slice(0, MAX_TOOL_ROWS);
}

/**
 * Trims a player to the fields used in search, ranking and following results.
 */
export function trimPlayerSummary(player: PlayerSummarySource) {
  return {
    id: player.id,
    name: player.name,
    country: player.country,
    rank: player.rank,
    countryRank: player.countryRank,
    pp: player.pp,
    medals: player.medals,
    medalsRank: player.medalsRank,
    medalsCountryRank: player.medalsCountryRank,
    inactive: player.inactive,
    banned: player.banned,
  };
}

/**
 * Trims a full player profile to the fields the model needs, dropping the raw player object.
 */
export function trimPlayerProfile(player: PlayerProfileSource) {
  return {
    ...trimPlayerSummary(player),
    averageRankedAccuracy: player.statistics.averageRankedAccuracy,
    rankedScoreCount: player.statistics.rankedScores,
    unrankedScoreCount: player.statistics.unrankedScores,
    totalScoreCount: player.statistics.totalScores,
    topPp: player.topPp,
    joinedDate: player.joinedDate.toISOString(),
    trackedSince: player.trackedSince.toISOString(),
  };
}

function trimLeaderboard(leaderboard: LeaderboardSource) {
  return {
    leaderboardId: leaderboard.id,
    mapName: leaderboard.songName,
    mapper: leaderboard.songAuthorName,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
    stars: leaderboard.difficulty.stars,
    ranked: leaderboard.ranked,
  };
}

/**
 * Trims a score row to ids, map details, score values and a timestamp.
 */
export function trimPlayerScore<TScore extends TrimmableScore>(entry: PlayerScoreSource<TScore>) {
  return {
    ...trimLeaderboard(entry.leaderboard),
    scoreId: entry.score.scoreId,
    accuracy: entry.score.accuracy,
    score: entry.score.score,
    pp: entry.score.pp,
    medals: entry.score.medals,
    misses: entry.score.misses,
    maxCombo: entry.score.maxCombo,
    fullCombo: entry.score.fullCombo,
    timestamp: entry.score.timestamp.toISOString(),
  };
}

/**
 * Trims one daily history entry to rank, pp and score-count fields.
 */
export function trimPlayerHistoryEntry(entry: ScoreSaberPlayerHistory) {
  return {
    rank: entry.rank,
    countryRank: entry.countryRank,
    pp: entry.pp,
    medals: entry.medals,
    averageRankedAccuracy: entry.averageRankedAccuracy,
    rankedScores: entry.rankedScores,
    totalScores: entry.totalScores,
  };
}

type HistoryRow = ReturnType<typeof trimPlayerHistoryEntry> & { date: string };

function difference(newest: number | null | undefined, oldest: number | null | undefined) {
  if (newest === null || newest === undefined || oldest === null || oldest === undefined) {
    return null;
  }
  return Math.round((newest - oldest) * 100) / 100;
}

/**
 * Computes the change between the oldest and newest history rows (rows are newest first), so the
 * model never has to subtract. Negative rank changes mean the player moved up.
 */
export function summarizeHistoryChange(rows: HistoryRow[]) {
  const newest = rows[0];
  const oldest = rows[rows.length - 1];
  if (!newest || !oldest || newest === oldest) {
    return null;
  }
  return {
    from: oldest.date,
    to: newest.date,
    pp: difference(newest.pp, oldest.pp),
    rank: difference(newest.rank, oldest.rank),
    countryRank: difference(newest.countryRank, oldest.countryRank),
    medals: difference(newest.medals, oldest.medals),
    rankedScores: difference(newest.rankedScores, oldest.rankedScores),
  };
}
