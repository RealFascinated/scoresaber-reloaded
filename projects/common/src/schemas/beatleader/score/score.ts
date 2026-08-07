import { Type, type StaticDecode } from "@sinclair/typebox";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const BeatLeaderMissesSchema = Type.Object({
  misses: Type.Number(),
  missedNotes: Type.Number(),
  bombCuts: Type.Number(),
  wallsHit: Type.Number(),
  badCuts: Type.Number(),
});

export const BeatLeaderScoreSchema = Type.Object({
  // Identifiers
  playerId: Type.String(),
  songHash: Type.String(),
  leaderboardId: Type.String(),
  scoreId: Type.Number(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,

  pauses: Type.Number(),
  fcAccuracy: Type.Number(),
  fullCombo: Type.Boolean(),
  handAccuracy: Type.Object({
    left: Type.Number(),
    right: Type.Number(),
  }),
  misses: BeatLeaderMissesSchema,
  scoreImprovement: Type.Object({
    score: Type.Number(),
    pauses: Type.Number(),
    misses: BeatLeaderMissesSchema,
    handAccuracy: Type.Object({
      left: Type.Number(),
      right: Type.Number(),
    }),
  }),
  savedReplay: Type.Boolean(),
  timestamp: Type.Date(),
});

export type BeatLeaderScore = StaticDecode<typeof BeatLeaderScoreSchema>;
