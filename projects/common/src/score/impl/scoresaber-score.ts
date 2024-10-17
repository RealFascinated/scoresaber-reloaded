import Score from "../score";
import { Modifier } from "../modifier";
import ScoreSaberScoreToken from "../../types/token/scoresaber/score-saber-score-token";
import ScoreSaberLeaderboardPlayerInfoToken from "../../types/token/scoresaber/score-saber-leaderboard-player-info-token";

export default interface ScoreSaberScore extends Score {
  /**
   * The score's id.
   */
  readonly id: string;

  /**
   * The amount of pp for the score.
   * @private
   */
  readonly pp: number;

  /**
   * The weight of the score, or undefined if not ranked.s
   * @private
   */
  readonly weight?: number;

  /**
   * The player who set the score
   */
  readonly playerInfo: ScoreSaberLeaderboardPlayerInfoToken;
}

/**
 * Gets a {@link ScoreSaberScore} from a {@link ScoreSaberScoreToken}.
 *
 * @param token the token to convert
 */
export function getScoreSaberScoreFromToken(token: ScoreSaberScoreToken): ScoreSaberScore {
  const modifiers: Modifier[] =
    token.modifiers == undefined || token.modifiers === ""
      ? []
      : token.modifiers.split(",").map(mod => {
          mod = mod.toUpperCase();
          const modifier = Modifier[mod as keyof typeof Modifier];
          if (modifier === undefined) {
            throw new Error(`Unknown modifier: ${mod}`);
          }
          return modifier;
        });

  return {
    leaderboard: "scoresaber",
    score: token.baseScore,
    rank: token.rank,
    modifiers: modifiers,
    misses: token.missedNotes,
    badCuts: token.badCuts,
    fullCombo: token.fullCombo,
    timestamp: new Date(token.timeSet),
    id: token.id,
    pp: token.pp,
    weight: token.weight,
    playerInfo: token.leaderboardPlayerInfo,
  };
}
