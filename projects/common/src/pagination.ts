import { NotFoundError } from "backend/src/error/not-found-error";
import { Metadata } from "./types/metadata";

export class Pagination<T> {
  /**
   * The amount of items per page.
   * @private
   */
  private itemsPerPage: number = 0;

  /**
   * The amount of items in total.
   * @private
   */
  private totalItems: number = 0;

  /**
   * The items to paginate.
   * @private
   */
  private items: T[] = [];

  /**
   * Sets the number of items per page.
   *
   * @param itemsPerPage - The number of items per page.
   * @returns the pagination
   */
  setItemsPerPage(itemsPerPage: number): Pagination<T> {
    this.itemsPerPage = itemsPerPage;
    return this;
  }

  /**
   * Sets the items to paginate.
   *
   * @param items the items to paginate
   * @returns the pagination
   */
  setItems(items: T[]): Pagination<T> {
    this.items = items;
    this.totalItems = items.length;
    return this;
  }

  /**
   * Gets a page of items.
   *
   * @param page the page number to retrieve.
   * @returns the page of items.
   * @throws throws an error if the page number is invalid.
   */
  getPage(page: number): Page<T> {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

    if (page < 1 || page > totalPages) {
      throw new NotFoundError("Invalid page number");
    }

    const items = this.items.slice((page - 1) * this.itemsPerPage, page * this.itemsPerPage);
    return new Page<T>(items, new Metadata(totalPages, this.totalItems, page, this.itemsPerPage));
  }
}

class Page<T> {
  readonly items: T[];
  readonly metadata: Metadata;

  constructor(items: T[], metadata: Metadata) {
    this.items = items;
    this.metadata = metadata;
  }
}
