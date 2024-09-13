export default interface BeatSaverMapStats {
  /**
   * The amount of time the map has been played.
   */
  plays: number;

  /**
   * The amount of times the map has been downloaded.
   */
  downloads: number;

  /**
   * The amount of times the map has been upvoted.
   */
  upvotes: number;

  /**
   * The amount of times the map has been downvoted.
   */
  downvotes: number;

  /**
   * The score for the map
   */
  score: number;

  /**
   * The amount of reviews for the map.
   */
  reviews: number;
}
