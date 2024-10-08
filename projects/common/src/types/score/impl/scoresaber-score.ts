import Score from "../score";
import { Modifier } from "../modifier";
import ScoreSaberScoreToken from "../../token/scoresaber/score-saber-score-token";

export default class ScoreSaberScore extends Score {
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
    super(score, weight, rank, worth, modifiers, misses, badCuts, fullCombo, timestamp);
  }

  /**
   * Gets a {@link ScoreSaberScore} from a {@link ScoreSaberScoreToken}.
   *
   * @param token the token to convert
   */
  public static fromToken(token: ScoreSaberScoreToken): ScoreSaberScore {
    const modifiers: Modifier[] = token.modifiers.split(",").map(mod => {
      mod = mod.toUpperCase();
      const modifier = Modifier[mod as keyof typeof Modifier];
      if (modifier === undefined) {
        throw new Error(`Unknown modifier: ${mod}`);
      }
      return modifier;
    });

    return new ScoreSaberScore(
      token.baseScore,
      token.weight,
      token.rank,
      token.pp,
      modifiers,
      token.missedNotes,
      token.badCuts,
      token.fullCombo,
      new Date(token.timeSet)
    );
  }
}
