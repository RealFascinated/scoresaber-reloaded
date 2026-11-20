import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { WeightedGain } from "../../suggested-maps/suggested-maps-ranking";
import { classifyAccuracy } from "./accuracy-benchmarks";

const NEARBY_STARS = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_INCREASES = [0.25, 0.5, 1];

type ImprovableScore = {
  leaderboardId: number;
  stars: number;
  pp: number;
  accuracy: number;
  fullCombo: boolean;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Ranks a player's best scores by how much weighted pp a small accuracy increase on each would add, and
 * reports the player's best accuracy on maps of similar stars so the target can be judged as realistic.
 *
 * @param scores the player's ranked scores, best pp first
 * @param options.limit how many of the best scores to evaluate
 * @param options.increases accuracy increases to evaluate, in percentage points
 * @returns rows sorted by the gain at the best accuracy the player has reached on similar stars, else the first increase
 */
export function buildImprovableScores(
  scores: ImprovableScore[],
  options: { limit?: number; increases?: number[] } = {}
) {
  const increases = options.increases ?? DEFAULT_INCREASES;
  const gain = new WeightedGain(scores.map(score => score.pp));
  const evaluate = (score: ImprovableScore, accuracy: number, playerBest: number | null) => {
    const rawPp = ScoreSaberCurve.getPp(score.stars, accuracy);
    return {
      ...classifyAccuracy(accuracy, score.stars, playerBest),
      accuracy: round(accuracy),
      rawPp: round(rawPp),
      weightedGain: round(gain.replace(score.pp, rawPp)),
    };
  };
  const evaluated = scores.slice(0, options.limit ?? DEFAULT_LIMIT).map((score, index) => {
    const nearbyAccuracies = scores
      .filter(other => other !== score && Math.abs(other.stars - score.stars) <= NEARBY_STARS)
      .map(other => other.accuracy);
    const bestNearby = nearbyAccuracies.length === 0 ? null : Math.max(...nearbyAccuracies);
    return {
      leaderboardId: score.leaderboardId,
      pp: round(score.pp),
      rankInTopPlays: index + 1,
      stars: score.stars,
      accuracy: round(score.accuracy),
      fullCombo: score.fullCombo,
      bestAccuracyAtSimilarStars: bestNearby === null ? null : round(bestNearby),
      gainAtBestSimilarAccuracy:
        bestNearby !== null && bestNearby > score.accuracy ? evaluate(score, bestNearby, bestNearby) : null,
      gains: increases.map(increase => evaluate(score, Math.min(100, score.accuracy + increase), bestNearby)),
    };
  });
  const realisticGain = (row: (typeof evaluated)[number]) => {
    if (row.gainAtBestSimilarAccuracy !== null) {
      return row.gainAtBestSimilarAccuracy.weightedGain;
    }
    const attainable = row.gains.find(gain => gain.tier === "reachable" || gain.tier === "stretch");
    return attainable?.weightedGain ?? 0;
  };
  return evaluated.sort((a, b) => realisticGain(b) - realisticGain(a));
}
