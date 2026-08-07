import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberV2ProfileStatIdSchema = Type.Union([
  Type.Literal("rankedPlays"),
  Type.Literal("rankedScore"),
  Type.Literal("rankedAcc"),
  Type.Literal("plusOnePP"),
  Type.Literal("totalPlays"),
  Type.Literal("totalScore"),
  Type.Literal("joined"),
  Type.Literal("replayViews"),
  Type.Literal("role"),
]);

export type ScoreSaberV2ProfileStatId = StaticDecode<typeof ScoreSaberV2ProfileStatIdSchema>;

export const ScoreSaberV2ProfileChartMetricIdSchema = Type.Union([
  Type.Literal("rank"),
  Type.Literal("totalPP"),
  Type.Literal("averageAccuracy"),
  Type.Literal("totalSubmittedPlays"),
]);

export type ScoreSaberV2ProfileChartMetricId = StaticDecode<typeof ScoreSaberV2ProfileChartMetricIdSchema>;

export const ScoreSaberV2ProfileSectionIdSchema = Type.Union([
  Type.Literal("charts"),
  Type.Literal("bio"),
  Type.Literal("pinnedScores"),
  Type.Literal("scores"),
]);

export type ScoreSaberV2ProfileSectionId = StaticDecode<typeof ScoreSaberV2ProfileSectionIdSchema>;

export const ScoreSaberV2ProfileCustomizationTokenSchema = Type.Object({
  backgroundImage: Type.Union([Type.String(), Type.Null()]),
  backgroundImageVersion: Type.Union([Type.Number(), Type.Null()]),
  accentColor: Type.Union([Type.String(), Type.Null()]),
  accentForegroundColor: Type.Union([Type.String(), Type.Null()]),
  accentForegroundActiveColor: Type.Union([Type.String(), Type.Null()]),
  supporterNameColorEnabled: Type.Boolean(),
  badgeOrder: Type.Union([Type.Array(Type.Number()), Type.Null()]),
  badgeComments: Type.Union([Type.Record(Type.String(), Type.String()), Type.Null()]),
  statOrder: Type.Union([Type.Array(ScoreSaberV2ProfileStatIdSchema), Type.Null()]),
  enabledStatIds: Type.Union([Type.Array(ScoreSaberV2ProfileStatIdSchema), Type.Null()]),
  chartMetricIds: Type.Union([Type.Array(ScoreSaberV2ProfileChartMetricIdSchema), Type.Null()]),
  sectionOrder: Type.Union([Type.Array(ScoreSaberV2ProfileSectionIdSchema), Type.Null()]),
});

export type ScoreSaberV2ProfileCustomizationToken = StaticDecode<
  typeof ScoreSaberV2ProfileCustomizationTokenSchema
>;
