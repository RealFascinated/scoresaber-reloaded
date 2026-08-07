import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderModifierRatingSchema } from "../modifier/modifier-rating";
import { BeatLeaderModifierSchema } from "../modifier/modifiers";

const nullableNumber = Type.Union([Type.Number(), Type.Null()]);

/**
 * Raw `DifficultyDescriptionExtension` token mirroring the upstream
 * `DifficultyDescriptionExtension` schema. `context` is serialized as a number
 * by the API even though the generated OpenAPI documents it as a string.
 */
export const BeatLeaderDifficultyDescriptionExtensionSchema = Type.Object({
  id: Type.Number(),
  context: Type.Number(),
  maxScoreRight: Type.Number(),
  maxScoreLeft: Type.Number(),
});

export type BeatLeaderDifficultyDescriptionExtensionToken = StaticDecode<
  typeof BeatLeaderDifficultyDescriptionExtensionSchema
>;

/**
 * Raw `DifficultyDescription` token mirroring the upstream
 * `DifficultyDescription` schema. `status`/`type`/`requirements` are serialized
 * as numbers by the API even though the generated OpenAPI documents them as
 * strings, so they stay raw numbers.
 */
export const BeatLeaderDifficultyDescriptionSchema = Type.Object({
  id: Type.Number(),
  value: Type.Number(),
  mode: Type.Number(),
  difficultyName: Type.String(),
  modeName: Type.String(),
  status: Type.Number(),
  modifierValues: Type.Union([BeatLeaderModifierSchema, Type.Null()]),
  modifiersRating: Type.Union([BeatLeaderModifierRatingSchema, Type.Null()]),
  nominatedTime: Type.Number(),
  qualifiedTime: Type.Number(),
  rankedTime: Type.Number(),
  hash: Type.String(),
  songId: Type.Union([Type.String(), Type.Null()]),
  customDifficultyName: Type.Union([Type.String(), Type.Null()]),
  speedTags: Type.Number(),
  styleTags: Type.Number(),
  featureTags: Type.Number(),
  stars: nullableNumber,
  predictedAcc: nullableNumber,
  passRating: nullableNumber,
  accRating: nullableNumber,
  techRating: nullableNumber,
  multiRating: nullableNumber,
  linearPercentage: nullableNumber,
  peakSustainedEBPM: nullableNumber,
  njs: Type.Number(),
  nps: Type.Number(),
  notes: Type.Number(),
  chains: Type.Number(),
  sliders: Type.Number(),
  bombs: Type.Number(),
  walls: Type.Number(),
  maxScore: Type.Number(),
  duration: Type.Number(),
  noteJumpStartBeatOffset: Type.Number(),
  mapVersion: Type.Union([Type.String(), Type.Null()]),
  requirements: Type.Number(),
  type: Type.Number(),
  difficultyStatisticsId: Type.Union([Type.Number(), Type.Null()]),
  extensions: Type.Array(BeatLeaderDifficultyDescriptionExtensionSchema),
});

export type BeatLeaderDifficultyDescriptionToken = StaticDecode<typeof BeatLeaderDifficultyDescriptionSchema>;
