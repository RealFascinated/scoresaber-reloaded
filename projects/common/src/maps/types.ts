export const MapCategory = {
  Trending: 0,
  DateRanked: 1,
  ScoresSet: 2,
  StarDifficulty: 3,
  Author: 4,
};

export const MapSort = {
  Descending: 0,
  Ascending: 1,
};

export type StarFilter = {
  /**
   * The minimum star rating.
   */
  min?: number;

  /**
   * The maximum star rating.
   */
  max?: number;
};
