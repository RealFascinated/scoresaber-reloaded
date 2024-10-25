import { ScoreSorter } from "../score-sorter";
import { ScoreSaberScore } from "../../model/score/impl/scoresaber-score";
import { ScoreSortType } from "../sort-type";
import { SortDirection } from "../sort-direction";

export class ScoreSaberScoreSorter extends ScoreSorter<ScoreSaberScore> {
  sort(type: ScoreSortType, direction: SortDirection, items: ScoreSaberScore[]): ScoreSaberScore[] {
    switch (type) {
      case ScoreSortType.date:
        return this.sortRecent(direction, items);
      case ScoreSortType.pp:
        return this.sortPp(direction, items);
      case ScoreSortType.accuracy:
        return this.sortAccuracy(direction, items);
      case ScoreSortType.misses:
        return this.sortMisses(direction, items);
      default:
        return items;
    }
  }

  /**
   * Sorts the scores by the time they were set.
   *
   * @param direction the direction to sort the scores
   * @param items the scores to sort
   * @returns the sorted scores
   */
  sortRecent(direction: SortDirection, items: ScoreSaberScore[]): ScoreSaberScore[] {
    return items.sort((a, b) =>
      direction === SortDirection.ASC
        ? a.timestamp.getTime() - b.timestamp.getTime()
        : b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Sorts the scores by their pp value
   *
   * @param direction the direction to sort the scores
   * @param items the scores to sort
   * @returns the sorted scores
   */
  sortPp(direction: SortDirection, items: ScoreSaberScore[]): ScoreSaberScore[] {
    return items.sort((a, b) => (direction === SortDirection.ASC ? a.pp - b.pp : b.pp - a.pp));
  }

  /**
   * Sorts the scores by their accuracy value
   *
   * @param direction the direction to sort the scores
   * @param items the scores to sort
   * @returns the sorted scores
   */
  sortAccuracy(direction: SortDirection, items: ScoreSaberScore[]): ScoreSaberScore[] {
    return items.sort((a, b) => (direction === SortDirection.ASC ? a.accuracy - b.accuracy : b.accuracy - a.accuracy));
  }

  /**
   * Sorts the scores by their misses
   *
   * @param direction the direction to sort the scores
   * @param items the scores to sort
   * @returns the sorted scores
   */
  sortMisses(direction: SortDirection, items: ScoreSaberScore[]): ScoreSaberScore[] {
    return items.sort((a, b) => (direction === SortDirection.ASC ? a.misses - b.misses : b.misses - a.misses));
  }
}
