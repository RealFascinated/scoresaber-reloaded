export interface PlayerTrackedSince {
  /**
   * Whether the player statistics are being tracked
   */
  tracked: boolean;

  /**
   * The amount of days the player has been tracked
   */
  daysTracked?: number;
}
