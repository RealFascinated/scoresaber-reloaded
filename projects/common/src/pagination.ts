import { Metadata } from "./types/metadata";
import { NotFoundError } from "./error/not-found-error";

type FetchItemsFunction<T> = (fetchItems: FetchItems) => Promise<T[]>;

export class Pagination<T> {
  private itemsPerPage: number = 0;
  private totalItems: number = 0;
  private items: T[] | null = null; // Optional array to hold set items

  /**
   * Sets the number of items per page.
   * @param itemsPerPage - The number of items per page.
   * @returns the pagination
   */
  setItemsPerPage(itemsPerPage: number): Pagination<T> {
    this.itemsPerPage = itemsPerPage;
    return this;
  }

  /**
   * Sets the items to paginate.
   * @param items - The items to paginate.
   * @returns the pagination
   */
  setItems(items: T[]): Pagination<T> {
    this.items = items;
    this.totalItems = items.length;
    return this;
  }

  /**
   * Sets the total number of items.
   * @param totalItems - Total number of items.
   * @returns the pagination
   */
  setTotalItems(totalItems: number): Pagination<T> {
    this.totalItems = totalItems;
    return this;
  }

  /**
   * Gets a page of items, using either static items or a dynamic fetchItems callback.
   * @param page - The page number to retrieve.
   * @param fetchItems - The async function to fetch items if setItems was not used.
   * @returns A promise resolving to the page of items.
   * @throws throws an error if the page number is invalid.
   */
  async getPage(page: number, fetchItems?: FetchItemsFunction<T>): Promise<Page<T>> {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

    if (page < 1 || page > totalPages) {
      throw new NotFoundError("Invalid page number");
    }

    // Calculate the range of items to fetch for the current page
    const start = (page - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    let pageItems: T[];

    // Use set items if they are present, otherwise use fetchItems callback
    if (this.items) {
      pageItems = this.items.slice(start, end);
    } else if (fetchItems) {
      pageItems = await fetchItems(new FetchItems(start, end));
    } else {
      throw new Error("Items function is not set and no fetchItems callback provided");
    }

    return new Page<T>(pageItems, new Metadata(totalPages, this.totalItems, page, this.itemsPerPage));
  }
}

class FetchItems {
  readonly start: number;
  readonly end: number;

  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }
}

export class Page<T> {
  readonly items: T[];
  readonly metadata: Metadata;

  constructor(items: T[], metadata: Metadata) {
    this.items = items;
    this.metadata = metadata;
  }

  /**
   * Converts the page to a JSON object.
   */
  toJSON() {
    return {
      items: this.items,
      metadata: this.metadata,
    };
  }
}
