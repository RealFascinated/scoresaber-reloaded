import { Type, type Static } from "typebox";
import { MapCharacteristicSchema } from "../map/map-characteristic";
import { MapDifficultySchema } from "../map/map-difficulty";

/** A ranked map and how much more pp it pays than a map of the same stars. */
export const SuggestedMapSchema = Type.Object({
  leaderboardId: Type.Integer(),
  songHash: Type.String(),
  songName: Type.String(),
  songSubName: Type.String(),
  songAuthorName: Type.String(),
  levelAuthorName: Type.String(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
  stars: Type.Number(),
  /** Length of the map in seconds, from BeatSaver (0 when unknown). */
  seconds: Type.Number(),
  /** Notes per second, from BeatSaver (0 when unknown). */
  nps: Type.Number(),
  /** Number of scores the map's ease was fitted from. */
  scoreCount: Type.Integer(),
  /** Accuracy (0-100) the player is predicted to get, or the reference player without a player. */
  predictedAccuracy: Type.Number(),
  /** Raw pp that accuracy is worth. */
  predictedPp: Type.Number(),
  /** Weighted pp the player gains by setting the predicted score, null without a player. */
  weightedGain: Type.Union([Type.Number(), Type.Null()]),
  /** Accuracy needed to match the pp of the player's 100th best score, null without a player or when unreachable. */
  requiredAccuracy: Type.Union([Type.Number(), Type.Null()]),
  /** The player's current accuracy on the map, null when unplayed or without a player. */
  currentAccuracy: Type.Union([Type.Number(), Type.Null()]),
  /** The player's current raw pp on the map, null when unplayed or without a player. */
  currentPp: Type.Union([Type.Number(), Type.Null()]),
  /** 0-1: how familiar the map's stars are from the player's current play.  */
  familiarity: Type.Number(),
  /**
   * What the maps are ranked by: weighted gain, times familiarity, times a factor for bonus pp (0.25 to 2) so
   * maps that pay more than their stars suggest beat maps that are only hard. Equals bonus pp without a player.
   */
  score: Type.Number(),
});

export type SuggestedMap = Static<typeof SuggestedMapSchema>;

export const SuggestedMapsResponseSchema = Type.Object({
  /** The player's fitted skill, null without a player. */
  playerSkill: Type.Union([Type.Number(), Type.Null()]),
  /**
   * The star, length and density limits fitted to the player's own best scores and applied unless the request
   * sets them. Null without a player or with too few scores. Infinite limits are sent as null.
   */
  playerRanges: Type.Union([
    Type.Object({
      minStars: Type.Number(),
      maxStars: Type.Number(),
      minSeconds: Type.Number(),
      maxSeconds: Type.Union([Type.Number(), Type.Null()]),
      maxNps: Type.Union([Type.Number(), Type.Null()]),
    }),
    Type.Null(),
  ]),
  /** When the map eases were last fitted. */
  updatedAt: Type.String(),
  maps: Type.Array(SuggestedMapSchema),
});

export type SuggestedMapsResponse = Static<typeof SuggestedMapsResponseSchema>;
