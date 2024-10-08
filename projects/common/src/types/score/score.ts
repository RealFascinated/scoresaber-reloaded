import { Modifier } from "./modifier";

export default class Score {
  /**
   * The base score for the score.
   * @private
   */
  private readonly _score: number;

  /**
   * The weight of the score, or undefined if not ranked.s
   * @private
   */
  private readonly _weight: number | undefined;

  /**
   * The rank for the score.
   * @private
   */
  private readonly _rank: number;

  /**
   * The worth of the score (this could be pp, ap, cr, etc.),
   * or undefined if not ranked.
   * @private
   */
  private readonly _worth: number;

  /**
   * The modifiers used on the score.
   * @private
   */
  private readonly _modifiers: Modifier[];

  /**
   * The amount missed notes.
   * @private
   */
  private readonly _misses: number;

  /**
   * The amount of bad cuts.
   * @private
   */
  private readonly _badCuts: number;

  /**
   * Whether every note was hit.
   * @private
   */
  private readonly _fullCombo: boolean;

  /**
   * The time the score was set.
   * @private
   */
  private readonly _timestamp: Date;

  constructor(
    score: number,
    weight: number | undefined,
    rank: number,
    worth: number,
    modifiers: Modifier[],
    misses: number,
    badCuts: number,
    fullCombo: boolean,
    timestamp: Date
  ) {
    this._score = score;
    this._weight = weight;
    this._rank = rank;
    this._worth = worth;
    this._modifiers = modifiers;
    this._misses = misses;
    this._badCuts = badCuts;
    this._fullCombo = fullCombo;
    this._timestamp = timestamp;
  }

  get score(): number {
    return this._score;
  }

  get weight(): number | undefined {
    return this._weight;
  }

  get rank(): number {
    return this._rank;
  }

  get worth(): number {
    return this._worth;
  }

  get modifiers(): Modifier[] {
    return this._modifiers;
  }

  get misses(): number {
    return this._misses;
  }

  get badCuts(): number {
    return this._badCuts;
  }

  get fullCombo(): boolean {
    return this._fullCombo;
  }

  get timestamp(): Date {
    return this._timestamp;
  }
}
