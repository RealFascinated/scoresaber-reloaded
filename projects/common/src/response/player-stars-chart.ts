export type PlayerStarChartResponse = {
  /**
   * The star chart graph
   */
  data: PlayerStarChartDataPoint[];
};

export type PlayerStarChartDataPoint = {
  /**
   * The accuracy for this data point
   */
  accuracy: number;

  /**
   * The stars for this data point
   */
  stars: number;
};
