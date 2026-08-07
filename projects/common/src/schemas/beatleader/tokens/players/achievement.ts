import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `AchievementLevel` token mirroring the upstream `AchievementLevel` schema.
 */
export const BeatLeaderAchievementLevelSchema = Type.Object({
  id: Type.Number(),
  image: Type.String(),
  smallImage: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  detailedDescription: Type.Union([Type.String(), Type.Null()]),
  color: Type.Union([Type.String(), Type.Null()]),
  value: Type.Union([Type.Number(), Type.Null()]),
  level: Type.Number(),
  achievementDescriptionId: Type.Number(),
});

export type BeatLeaderAchievementLevelToken = StaticDecode<typeof BeatLeaderAchievementLevelSchema>;

/**
 * Raw `AchievementDescription` token mirroring the upstream
 * `AchievementDescription` schema.
 */
export const BeatLeaderAchievementDescriptionSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  description: Type.String(),
  link: Type.Union([Type.String(), Type.Null()]),
  levels: Type.Union([Type.Array(BeatLeaderAchievementLevelSchema), Type.Null()]),
});

export type BeatLeaderAchievementDescriptionToken = StaticDecode<
  typeof BeatLeaderAchievementDescriptionSchema
>;

/**
 * Raw `Achievement` token mirroring the upstream `Achievement` schema.
 */
export const BeatLeaderAchievementSchema = Type.Object({
  id: Type.Number(),
  playerId: Type.String(),
  achievementDescriptionId: Type.Number(),
  achievementDescription: BeatLeaderAchievementDescriptionSchema,
  levelId: Type.Union([Type.Number(), Type.Null()]),
  level: Type.Union([BeatLeaderAchievementLevelSchema, Type.Null()]),
  additionalLevels: Type.Union([Type.String(), Type.Null()]),
  timeset: Type.Number(),
  count: Type.Number(),
});

export type BeatLeaderAchievementToken = StaticDecode<typeof BeatLeaderAchievementSchema>;
