import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../date";
import { MapCharacteristicSchema } from "../map/map-characteristic";
import { MapDifficultySchema } from "../map/map-difficulty";

/**
 * A reweight: every ranked map whose star rating was changed within the same few days.
 */
export const ReweightSchema = Type.Object({
  id: Type.Integer(),
  /** Display name, e.g. "January 2026 Reweight". */
  name: Type.String(),
  startedAt: DateSchema,
  endedAt: DateSchema,
  leaderboardCount: Type.Integer(),
  /** Players whose pp changed. 0 for reweights that happened before pp changes were tracked. */
  playerCount: Type.Integer(),
  /** Scores whose pp changed. 0 for reweights that happened before pp changes were tracked. */
  scoreCount: Type.Integer(),
  /** True while the pp changes of some of its maps are still being captured. */
  ppPending: Type.Boolean(),
});

/** The map identity shown next to a reweight's leaderboard and score changes. */
export const ReweightLeaderboardInfoSchema = Type.Object({
  leaderboardId: Type.Integer(),
  songHash: Type.String(),
  songName: Type.String(),
  songSubName: Type.String(),
  songAuthorName: Type.String(),
  levelAuthorName: Type.String(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
});

/** A leaderboard re-rated by a reweight, from its first previous to its last new star rating. */
export const ReweightLeaderboardChangeSchema = Type.Intersect([
  ReweightLeaderboardInfoSchema,
  Type.Object({
    previousStars: Type.Number(),
    newStars: Type.Number(),
  }),
]);

/** A reweight's effect on one player. */
export const ReweightPlayerChangeSchema = Type.Object({
  playerId: Type.String(),
  name: Type.String(),
  avatar: Type.String(),
  country: Type.String(),
  ppBefore: Type.Number(),
  ppAfter: Type.Number(),
  ppDelta: Type.Number(),
  scoresChanged: Type.Integer(),
});

/** A reweight's effect on one of a player's scores. */
export const ReweightScoreChangeSchema = Type.Intersect([
  ReweightLeaderboardInfoSchema,
  Type.Object({
    scoreId: Type.Integer(),
    ppBefore: Type.Number(),
    ppAfter: Type.Number(),
    ppDelta: Type.Number(),
  }),
]);

/** A reweight and its effect on a single player. */
export const PlayerReweightSchema = Type.Object({
  reweight: ReweightSchema,
  ppBefore: Type.Number(),
  ppAfter: Type.Number(),
  ppDelta: Type.Number(),
  scoresChanged: Type.Integer(),
});

/** The minimum needed to draw a reweight on a chart. */
export const ReweightMarkerSchema = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  date: DateSchema,
});

export type Reweight = StaticDecode<typeof ReweightSchema>;
export type ReweightLeaderboardInfo = StaticDecode<typeof ReweightLeaderboardInfoSchema>;
export type ReweightLeaderboardChange = StaticDecode<typeof ReweightLeaderboardChangeSchema>;
export type ReweightPlayerChange = StaticDecode<typeof ReweightPlayerChangeSchema>;
export type ReweightScoreChange = StaticDecode<typeof ReweightScoreChangeSchema>;
export type PlayerReweight = StaticDecode<typeof PlayerReweightSchema>;
export type ReweightMarker = StaticDecode<typeof ReweightMarkerSchema>;
