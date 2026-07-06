export type ScoreSaberV2ProfileStatId =
  | "rankedPlays"
  | "rankedScore"
  | "rankedAcc"
  | "plusOnePP"
  | "totalPlays"
  | "totalScore"
  | "joined"
  | "replayViews"
  | "role";

export type ScoreSaberV2ProfileChartMetricId = "rank" | "totalPP" | "averageAccuracy" | "totalSubmittedPlays";

export type ScoreSaberV2ProfileSectionId = "charts" | "bio" | "pinnedScores" | "scores";

export type ScoreSaberV2ProfileCustomizationToken = {
  backgroundImage: string | null;
  backgroundImageVersion: number | null;
  accentColor: string | null;
  accentForegroundColor: string | null;
  accentForegroundActiveColor: string | null;
  supporterNameColorEnabled: boolean;
  badgeOrder: number[] | null;
  badgeComments: Record<string, string> | null;
  statOrder: ScoreSaberV2ProfileStatId[] | null;
  enabledStatIds: ScoreSaberV2ProfileStatId[] | null;
  chartMetricIds: ScoreSaberV2ProfileChartMetricId[] | null;
  sectionOrder: ScoreSaberV2ProfileSectionId[] | null;
};
