import { Type, type StaticDecode } from "@sinclair/typebox";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";
import { MapDifficultyParitySummaryTokenSchema } from "./difficulty-parity-summary";

export const BeatSaverMapDifficultyTokenSchema = Type.Object({
  njs: Type.Number(),
  offset: Type.Number(),
  notes: Type.Number(),
  bombs: Type.Number(),
  obstacles: Type.Number(),
  nps: Type.Number(),
  length: Type.Number(),
  characteristic: MapCharacteristicSchema,
  difficulty: MapDifficultySchema,
  events: Type.Number(),
  chroma: Type.Boolean(),
  me: Type.Boolean(),
  ne: Type.Boolean(),
  cinema: Type.Boolean(),
  seconds: Type.Number(),
  paritySummary: MapDifficultyParitySummaryTokenSchema,
  maxScore: Type.Number(),
  label: Type.String(),
  blStars: Type.Optional(Type.Number()),
  stars: Type.Optional(Type.Number()),
  environment: Type.Optional(Type.String()),
  vivify: Type.Optional(Type.Boolean()),
});

export type BeatSaverMapDifficultyToken = StaticDecode<typeof BeatSaverMapDifficultyTokenSchema>;
