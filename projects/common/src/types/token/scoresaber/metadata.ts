export default interface ScoreSaberMetadataToken {
  /**
   * The total amount of returned results.
   */
  total: number;

  /**
   * The current page
   */
  page: number;

  /**
   * The amount of results per page
   */
  itemsPerPage: number;
}
