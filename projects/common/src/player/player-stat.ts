export type PlayerStatValue = {
  /**
   * The display name of the stat.
   */
  displayName: string;

  /**
   * The value of the stat.
   */
  value?: "rank" | "countryRank" | "pp";
};

export const PlayerStat: Record<string, PlayerStatValue> = {
  Rank: {
    displayName: "Rank",
    value: "rank",
  },
  CountryRank: {
    displayName: "Country Rank",
    value: "countryRank",
  },
  PerformancePoints: {
    displayName: "Performance Points",
    value: "pp",
  },
  TotalPlayCount: {
    displayName: "Total Play Count",
  },
  RankedPlayCount: {
    displayName: "Ranked Play Count",
  },
};
