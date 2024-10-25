import { ScoreSortType } from "./sort-type";
import { SortDirection } from "./sort-direction";

export abstract class ScoreSorter<T> {
  /**
   * Sorts the items
   *
   * @param type the type of sort
   * @param direction the direction of the sort
   * @param items the items to sort
   * @returns the sorted items
   */
  public abstract sort(type: ScoreSortType, direction: SortDirection, items: T[]): T[];
}
