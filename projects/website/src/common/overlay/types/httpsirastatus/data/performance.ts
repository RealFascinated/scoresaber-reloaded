export type HttpSiraStatus_Performance = {
  /**
   * The energy left in the battery.
   * Used with the Battery Energy modifier.
   */
  batteryEnergy: number | null;

  /**
   * The current combo.
   */
  combo: number;

  /**
   * The current max score.
   */
  currentMaxScore: number;

  /**
   * The current time in seconds.
   */
  currentSongTime: number;

  /**
   * ngl idek
   */
  energy: number;

  /**
   * The amount of bombs that have been hit.
   */
  hitBombs: number;

  /**
   * The amount of notes that have been hit.
   */
  hitNotes: number;

  /**
   * The score of the last note hit.
   */
  lastNoteScore: number;

  /**
   * The max combo for this score.
   */
  maxCombo: number;

  /**
   * The amount of missed notes.
   */
  missedNotes: number;

  /**
   * The current score multiplier.
   */
  multiplier: number;

  /**
   * The progress until the next multiplier.
   */
  multiplierProgress: number;

  /**
   * ??
   */
  passedBombs: number;
  passedNotes: number;

  /**
   * The current rank. (e.g. SS, S, A)
   */
  rank: string;

  /**
   * The current score.
   */
  rawScore: number;

  /**
   * The current relative score.
   */
  relativeScore: number;

  /**
   * The current (modified) score.
   */
  score: number;

  /**
   * Whether no-failed has been triggered.
   */
  softFailed: boolean;
};
