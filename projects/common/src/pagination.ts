import { NotFoundError } from "./error/not-found-error";
import { Metadata } from "./types/metadata";

type FetchItemsFunction<T> = (fetchItems: FetchItems) => Promise<T[]>;
type FetchItemsWithCursorFunction<T, TQuery = unknown> = (
  cursorInfo: CursorInfo<TQuery>
) => Promise<T[]>;
type GetCursorFunction<TItem> = (item: TItem) => Cursor;
type BuildCursorQueryFunction<TQuery> = (cursor: Cursor | null) => TQuery;

export class Pagination<T> {
  public itemsPerPage: number = 0;
  public totalItems: number = 0;
  private items: T[] | null = null;

  /**
   * Sets the number of items per page.
   * 
   * @param itemsPerPage the number of items per page.
   * @returns the pagination
   */
  setItemsPerPage(itemsPerPage: number): Pagination<T> {
    this.itemsPerPage = itemsPerPage;
    return this;
  }

  /**
   * Sets the items to paginate.
   * 
   * @param items the items to paginate.
   * @returns the pagination
   */
  setItems(items: T[]): Pagination<T> {
    this.items = items;
    this.totalItems = items.length;
    return this;
  }

  /**
   * Sets the total number of items.
   * 
   * @param totalItems the total number of items.
   * @returns the pagination
   */
  setTotalItems(totalItems: number): Pagination<T> {
    this.totalItems = totalItems;
    return this;
  }

  /**
   * Gets a page of items, using either static items or a dynamic fetchItems callback.
   * 
   * @param page the page number to retrieve.
   * @param fetchItems the async function to fetch items if setItems was not used.
   * @returns a promise resolving to the page of items.
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

    return {
      items: pageItems,
      metadata: {
        totalPages,
        totalItems: this.totalItems,
        page,
        itemsPerPage: this.itemsPerPage,
      },
    };
  }

  /**
   * Gets a page of items using cursor-based pagination for better performance on large datasets.
   * This method automatically handles cursor retrieval from previous pages and query building.
   *
   * @param page the page number to retrieve.
   * @param options the cursor pagination options
   * @returns A promise resolving to the page of items.
   * @throws throws an error if the page number is invalid.
   */
  async getPageWithCursor<TItem = unknown, TQuery = unknown>(
    page: number,
    options: {
      fetchItems: FetchItemsWithCursorFunction<T, TQuery>;
      getCursor: GetCursorFunction<TItem>;
      buildCursorQuery: BuildCursorQueryFunction<TQuery>;
      getPreviousPageItem: (query: TQuery) => Promise<TItem | null>;
      sortField: string;
      sortDirection: 1 | -1;
    }
  ): Promise<Page<T>> {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

    if (page < 1 || page > totalPages) {
      throw new NotFoundError("Invalid page number");
    }

    // For page 1, skip cursor retrieval entirely
    if (page === 1) {
      const cursorQuery = options.buildCursorQuery(null);
      const pageItems = await options.fetchItems(
        new CursorInfo<TQuery>(null, cursorQuery, this.itemsPerPage)
      );

      return {
        items: pageItems,
        metadata: {
          totalPages,
          totalItems: this.totalItems,
          page,
          itemsPerPage: this.itemsPerPage,
        },
      };
    }

    // For pages beyond the first, get cursor from previous page
    const previousPageQuery = options.buildCursorQuery(null);
    const previousPageItem = await options.getPreviousPageItem(previousPageQuery);
    const cursor = previousPageItem ? options.getCursor(previousPageItem) : null;

    // Build query with cursor and fetch items
    const cursorQuery = options.buildCursorQuery(cursor);
    const pageItems = await options.fetchItems(
      new CursorInfo<TQuery>(cursor, cursorQuery, this.itemsPerPage)
    );

    return {
      items: pageItems,
      metadata: {
        totalPages,
        totalItems: this.totalItems,
        page,
        itemsPerPage: this.itemsPerPage,
      },
    };
  }

  /**
   * Gets an empty page.
   * 
   * @param T the type of items in the page.
   * @returns the empty page.
   */
  public static empty<T>(): Page<T> {
    return {
      items: [],
      metadata: {
        totalPages: 1,
        totalItems: 0,
        page: 1,
        itemsPerPage: 0,
      },
    };
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

export class CursorInfo<TQuery = unknown> {
  readonly cursor: Cursor | null;
  readonly query: TQuery;
  readonly limit: number;

  constructor(cursor: Cursor | null, query: TQuery, limit: number) {
    this.cursor = cursor;
    this.query = query;
    this.limit = limit;
  }
}

export type Cursor = {
  readonly sortValue: unknown;
  readonly id: unknown;
};

export type Page<T> = {
  items: T[];
  readonly metadata: Metadata;
};
