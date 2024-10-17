import { Metadata } from "./metadata";

export type Page<T> = {
  /**
   * The data to return.
   */
  data: T[];

  /**
   * The metadata of the page.
   */
  metadata: Metadata;
};
