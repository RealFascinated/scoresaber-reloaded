import ScoreSaberPlayer from "./impl/scoresaber-player";
import { ChangeRange } from "./player";

export type PlayerStatValue = {
  /**
   * The type of the stat.
   */
  type: string;

  /**
   * The value of the stat.
   */
  value: (player: ScoreSaberPlayer, range: ChangeRange) => number | undefined;
};

export type PlayerStatChangeType =
  | "Rank"
  | "CountryRank"
  | "PerformancePoints"
  | "TotalPlayCount"
  | "RankedPlayCount"
  | "TotalScore"
  | "TotalRankedScore"
  | "AverageRankedAccuracy"
  | "TotalReplaysWatched";

export const PlayerStatChange: Record<PlayerStatChangeType, PlayerStatValue> = {
  Rank: {
    type: "Rank",
    value: (player, range) => player.statisticChange?.[range].rank,
  },
  CountryRank: {
    type: "Country Rank",
    value: (player, range) => player.statisticChange?.[range].countryRank,
  },
  PerformancePoints: {
    type: "Performance Points",
    value: (player, range) => player.statisticChange?.[range].pp,
  },
  TotalPlayCount: {
    type: "Total Play Count",
    value: (player, range) => player.statisticChange?.[range].scores?.totalScores,
  },
  RankedPlayCount: {
    type: "Ranked Play Count",
    value: (player, range) => player.statisticChange?.[range].scores?.totalRankedScores,
  },
  TotalScore: {
    type: "Total Score",
    value: (player, range) => player.statisticChange?.[range].score?.totalScore,
  },
  TotalRankedScore: {
    type: "Total Ranked Score",
    value: (player, range) => player.statisticChange?.[range].scores?.totalRankedScores,
  },
  AverageRankedAccuracy: {
    type: "Average Ranked Accuracy",
    value: (player, range) => player.statisticChange?.[range].accuracy?.averageRankedAccuracy,
  },
  TotalReplaysWatched: {
    type: "Total Replays Watched",
    value: (player, range) => player.statisticChange?.[range].replaysWatched,
  },
};
