export type Metadata = {
  /**
   * The amount of pages in the pagination
   */
  readonly totalPages: number;

  /**
   * The total amount of items
   */
  readonly totalItems: number;

  /**
   * The current page
   */
  readonly page: number;

  /**
   * The amount of items per page
   */
  readonly itemsPerPage: number;
};
