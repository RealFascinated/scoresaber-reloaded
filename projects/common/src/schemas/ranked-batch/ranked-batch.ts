import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../date";
import { MapCharacteristicSchema } from "../map/map-characteristic";
import { MapDifficultySchema } from "../map/map-difficulty";

/**
 * A ranked batch: every ranked map whose star rating was changed within the same few days.
 */
export const RankedBatchSchema = Type.Object({
  id: Type.Integer(),
  /** Display name, e.g. "January 2026 Ranked Batch". */
  name: Type.String(),
  startedAt: DateSchema,
  endedAt: DateSchema,
  /** Maps that were re-rated. */
  leaderboardCount: Type.Integer(),
  /** Maps that became ranked. */
  newLeaderboardCount: Type.Integer(),
  /** Players whose pp changed. 0 for ranked batches that happened before pp changes were tracked. */
  playerCount: Type.Integer(),
  /** Scores whose pp changed. 0 for ranked batches that happened before pp changes were tracked. */
  scoreCount: Type.Integer(),
  /** True while the pp changes of some of its maps are still being captured. */
  ppPending: Type.Boolean(),
});

/** The map identity shown next to a ranked batch's leaderboard and score changes. */
export const RankedBatchLeaderboardInfoSchema = Type.Object({
  leaderboardId: Type.Integer(),
  songHash: Type.String(),
  songName: Type.String(),
  songSubName: Type.String(),
  songAuthorName: Type.String(),
  levelAuthorName: Type.String(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
});

/** A leaderboard re-rated by a ranked batch, from its first previous to its last new star rating. */
export const RankedBatchLeaderboardChangeSchema = Type.Intersect([
  RankedBatchLeaderboardInfoSchema,
  Type.Object({
    previousStars: Type.Number(),
    newStars: Type.Number(),
  }),
]);

/** A leaderboard that became ranked in a ranked batch, with the stars it was ranked at. */
export const RankedBatchNewLeaderboardSchema = Type.Intersect([
  RankedBatchLeaderboardInfoSchema,
  Type.Object({
    stars: Type.Number(),
  }),
]);

/** A ranked batch's effect on one player. */
export const RankedBatchPlayerChangeSchema = Type.Object({
  playerId: Type.String(),
  name: Type.String(),
  avatar: Type.String(),
  country: Type.String(),
  ppBefore: Type.Number(),
  ppAfter: Type.Number(),
  ppDelta: Type.Number(),
  scoresChanged: Type.Integer(),
});

/** A ranked batch's effect on one of a player's scores. */
export const RankedBatchScoreChangeSchema = Type.Intersect([
  RankedBatchLeaderboardInfoSchema,
  Type.Object({
    scoreId: Type.Integer(),
    ppBefore: Type.Number(),
    ppAfter: Type.Number(),
    ppDelta: Type.Number(),
  }),
]);

/** A ranked batch and its effect on a single player. */
export const PlayerRankedBatchSchema = Type.Object({
  rankedBatch: RankedBatchSchema,
  ppBefore: Type.Number(),
  ppAfter: Type.Number(),
  ppDelta: Type.Number(),
  scoresChanged: Type.Integer(),
});

/** The minimum needed to draw a ranked batch on a chart. */
export const RankedBatchMarkerSchema = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  date: DateSchema,
});

export type RankedBatch = StaticDecode<typeof RankedBatchSchema>;
export type RankedBatchLeaderboardInfo = StaticDecode<typeof RankedBatchLeaderboardInfoSchema>;
export type RankedBatchNewLeaderboard = StaticDecode<typeof RankedBatchNewLeaderboardSchema>;
export type RankedBatchLeaderboardChange = StaticDecode<typeof RankedBatchLeaderboardChangeSchema>;
export type RankedBatchPlayerChange = StaticDecode<typeof RankedBatchPlayerChangeSchema>;
export type RankedBatchScoreChange = StaticDecode<typeof RankedBatchScoreChangeSchema>;
export type PlayerRankedBatch = StaticDecode<typeof PlayerRankedBatchSchema>;
export type RankedBatchMarker = StaticDecode<typeof RankedBatchMarkerSchema>;
