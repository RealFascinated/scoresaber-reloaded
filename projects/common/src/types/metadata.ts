export class Metadata {
  /**
   * The amount of pages in the pagination
   */
  public readonly totalPages: number;

  /**
   * The total amount of items
   */
  public readonly totalItems: number;

  /**
   * The current page
   */
  public readonly page: number;

  /**
   * The amount of items per page
   */
  public readonly itemsPerPage: number;

  constructor(totalPages: number, totalItems: number, page: number, itemsPerPage: number) {
    this.totalPages = totalPages;
    this.totalItems = totalItems;
    this.page = page;
    this.itemsPerPage = itemsPerPage;
  }
}
