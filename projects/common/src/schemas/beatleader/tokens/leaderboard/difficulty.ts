import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderModifierRatingSchema } from "../modifier/modifier-rating";
import { BeatLeaderModifierSchema } from "../modifier/modifiers";
import { BeatLeaderDifficultyStatisticsSchema } from "./difficulty-statistics";

const nullableNumber = Type.Union([Type.Number(), Type.Null()]);

/**
 * Raw `DifficultyResponse` token mirroring the upstream `DifficultyResponse` schema.
 * `status`/`type`/`requirements` are serialized as numbers by the API even though the
 * generated OpenAPI documents them as strings, so they stay raw numbers.
 */
export const BeatLeaderDifficultySchema = Type.Object({
  id: Type.Number(),
  value: Type.Number(),
  mode: Type.Number(),
  difficultyName: Type.String(),
  customDifficultyName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  mapVersion: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modeName: Type.String(),
  status: Type.Number(),
  modifierValues: BeatLeaderModifierSchema,
  modifiersRating: Type.Union([BeatLeaderModifierRatingSchema, Type.Null()]),
  nominatedTime: Type.Number(),
  qualifiedTime: Type.Number(),
  rankedTime: Type.Number(),
  speedTags: Type.Optional(Type.Number()),
  styleTags: Type.Optional(Type.Number()),
  featureTags: Type.Optional(Type.Number()),
  stars: nullableNumber,
  predictedAcc: nullableNumber,
  passRating: nullableNumber,
  accRating: nullableNumber,
  techRating: nullableNumber,
  multiRating: nullableNumber,
  type: Type.Number(),
  njs: Type.Number(),
  nps: Type.Number(),
  linearPercentage: Type.Optional(nullableNumber),
  peakSustainedEBPM: Type.Optional(nullableNumber),
  noteJumpStartBeatOffset: Type.Optional(Type.Number()),
  notes: Type.Number(),
  chains: Type.Optional(Type.Number()),
  sliders: Type.Optional(Type.Number()),
  bombs: Type.Number(),
  walls: Type.Number(),
  maxScore: Type.Number(),
  duration: Type.Number(),
  requirements: Type.Number(),
  difficultyStatistics: Type.Optional(Type.Union([BeatLeaderDifficultyStatisticsSchema, Type.Null()])),
});

export type BeatLeaderDifficultyToken = StaticDecode<typeof BeatLeaderDifficultySchema>;
