import ScoreSaberPlayer from "./impl/scoresaber-player";
import { StatisticRange } from "./player";

export type PlayerStatValue = {
  type: string;

  value: (player: ScoreSaberPlayer, range: StatisticRange) => number | undefined;
};

export type PlayerStatChangeType = "Rank" | "CountryRank" | "PerformancePoints" | "Medals";

export const PlayerStatChange: Record<PlayerStatChangeType, PlayerStatValue> = {
  Rank: {
    type: "Rank",
    value: (player, range) => player.statisticChange?.[range].rank ?? undefined,
  },
  CountryRank: {
    type: "Country Rank",
    value: (player, range) => player.statisticChange?.[range].countryRank ?? undefined,
  },
  PerformancePoints: {
    type: "Performance Points",
    value: (player, range) => player.statisticChange?.[range].pp ?? undefined,
  },
  Medals: {
    type: "Medals",
    value: (player, range) => player.statisticChange?.[range].medals ?? undefined,
  },
};
