export type PlayedMapsCalendarStat = {
  /**
   * The amount of ranked maps played.
   */
  rankedMaps: number;

  /**
   * The amount of unranked maps played.
   */
  unrankedMaps: number;

  /**
   * The total amount of maps played.
   */
  totalMaps: number;
};

export type PlayedMapsCalendarResponse = {
  /**
   * The days for the calendar.
   */
  days: Record<number, PlayedMapsCalendarStat>;

  /**
   * The valid year and months
   */
  metadata: Record<number, number[]>;
};
