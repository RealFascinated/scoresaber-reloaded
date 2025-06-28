import ScoreSaberPlayer from "./impl/scoresaber-player";
import { StatisticRange } from "./player";

export type PlayerStatValue = {
  /**
   * The type of the stat.
   */
  type: string;

  /**
   * The value of the stat.
   */
  value: (player: ScoreSaberPlayer, range: StatisticRange) => number | undefined;
};

export type PlayerStatChangeType = "Rank" | "CountryRank" | "PerformancePoints" | "Medals";

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
  Medals: {
    type: "Medals",
    value: (player, range) => player.statisticChange?.[range].medals,
  },
};
