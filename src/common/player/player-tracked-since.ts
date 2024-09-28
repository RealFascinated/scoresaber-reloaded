export interface PlayerTrackedSince {
  /**
   * Whether the player statistics are being tracked
   */
  tracked: boolean;

  /**
   * The date the player was first tracked
   */
  trackedSince?: string;
}
