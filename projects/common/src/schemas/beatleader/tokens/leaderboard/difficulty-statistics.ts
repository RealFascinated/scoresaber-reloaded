import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `MapSwingData` token mirroring the upstream `MapSwingData` schema.
 */
export const BeatLeaderMapSwingDataSchema = Type.Object({
  id: Type.Number(),
  bpmTime: Type.Number(),
  direction: Type.Number(),
  forehand: Type.Boolean(),
  parityErrors: Type.Boolean(),
  bombAvoidance: Type.Boolean(),
  isLinear: Type.Boolean(),
  angleStrain: Type.Number(),
  repositioningDistance: Type.Number(),
  rotationAmount: Type.Number(),
  swingFrequency: Type.Number(),
  distanceDiff: Type.Number(),
  swingSpeed: Type.Number(),
  hitDistance: Type.Number(),
  stress: Type.Number(),
  lowSpeedFalloff: Type.Number(),
  stressMultiplier: Type.Number(),
  njsBuff: Type.Number(),
  wallBuff: Type.Number(),
  isStream: Type.Boolean(),
  swingDiff: Type.Number(),
  swingTech: Type.Number(),
  difficultyStatisticsId: Type.Number(),
});

export type BeatLeaderMapSwingDataToken = StaticDecode<typeof BeatLeaderMapSwingDataSchema>;

/**
 * Raw `DifficultyStatisticsResponse` token mirroring the upstream
 * `DifficultyStatisticsResponse` schema.
 */
export const BeatLeaderDifficultyStatisticsSchema = Type.Object({
  id: Type.Number(),
  stacks: Type.Number(),
  towers: Type.Number(),
  sliders: Type.Number(),
  curvedSliders: Type.Number(),
  windows: Type.Number(),
  slantedWindows: Type.Number(),
  dodgeWalls: Type.Number(),
  crouchWalls: Type.Number(),
  parityErrors: Type.Number(),
  bombAvoidances: Type.Number(),
  linearSwings: Type.Number(),
  swingData: Type.Array(BeatLeaderMapSwingDataSchema),
});

export type BeatLeaderDifficultyStatisticsToken = StaticDecode<typeof BeatLeaderDifficultyStatisticsSchema>;
