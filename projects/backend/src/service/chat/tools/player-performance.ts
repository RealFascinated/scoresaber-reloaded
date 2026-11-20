import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { WeightedGain } from "../../suggested-maps/suggested-maps-ranking";
import { classifyAccuracy, describeAccuracyRarity, getAccuracyBenchmark } from "./accuracy-benchmarks";

const RECENT_DAYS = 60;
const TOP_PERCENTILE_SIZE = 50;
const DAY_MS = 86_400_000;

type PerformanceScore = {
  leaderboardId: number;
  stars: number;
  pp: number;
  accuracy: number;
  fullCombo: boolean;
  timestamp: Date;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Summarizes how a player performs across their ranked scores: per whole-star bucket counts, accuracy
 * statistics, pp, full combo rate and recency, plus their weighted pp total, top score pp and the raw pp
 * a new score needs to add one weighted pp.
 *
 * @param scores the player's ranked scores, any order
 * @param now the time recent scores are measured from
 */
export function buildPlayerPerformance(scores: PerformanceScore[], now: Date) {
  const byPpDescending = [...scores].sort((a, b) => b.pp - a.pp);
  const ppsDescending = byPpDescending.map(score => score.pp);
  const weightedPpTotal = ppsDescending.reduce(
    (sum, pp, rank) => sum + pp * Math.pow(ScoreSaberCurve.WEIGHT_COEFFICIENT, rank),
    0
  );
  const topPp = (rank: number) => (ppsDescending.length < rank ? null : round(ppsDescending[rank - 1]));

  const topScores = new Set(byPpDescending.slice(0, TOP_PERCENTILE_SIZE));
  const weightedPpByScore = new Map(
    byPpDescending.map((score, rank) => [
      score,
      score.pp * Math.pow(ScoreSaberCurve.WEIGHT_COEFFICIENT, rank),
    ])
  );
  const allPlayersAccuracy = (stars: number) => {
    const benchmark = getAccuracyBenchmark(stars);
    return {
      median: benchmark.p50,
      top10Percent: benchmark.p90,
      top1Percent: benchmark.p99,
      top0_1Percent: benchmark.p999,
    };
  };
  const recentCutoff = now.getTime() - RECENT_DAYS * DAY_MS;
  const grouped = new Map<number, PerformanceScore[]>();
  for (const score of scores) {
    const minStars = Math.floor(score.stars);
    const bucket = grouped.get(minStars);
    if (bucket) {
      bucket.push(score);
    } else {
      grouped.set(minStars, [score]);
    }
  }

  const starBuckets = [...grouped.keys()]
    .sort((a, b) => a - b)
    .map(minStars => {
      const bucket = grouped.get(minStars) ?? [];
      const accuracies = bucket.map(score => score.accuracy);
      const recent = bucket.filter(score => score.timestamp.getTime() >= recentCutoff);
      const recentAccuracies = recent.map(score => score.accuracy);
      return {
        stars: `${minStars}-${minStars + 1}`,
        minStars,
        scoreCount: bucket.length,
        averageAccuracy: round(average(accuracies) ?? 0),
        medianAccuracy: round(median(accuracies)),
        bestAccuracy: round(Math.max(...accuracies)),
        bestAccuracyRarity: describeAccuracyRarity(Math.max(...accuracies), minStars),
        allPlayersAccuracy: allPlayersAccuracy(minStars),
        bestPp: round(Math.max(...bucket.map(score => score.pp))),
        fullComboRate: round(bucket.filter(score => score.fullCombo).length / bucket.length),
        inTop50: bucket.filter(score => topScores.has(score)).length,
        weightedPp: round(bucket.reduce((sum, score) => sum + (weightedPpByScore.get(score) ?? 0), 0)),
        recentScoreCount: recent.length,
        recentAverageAccuracy: recentAccuracies.length === 0 ? null : round(average(recentAccuracies) ?? 0),
      };
    });

  const recentScores = scores.filter(score => score.timestamp.getTime() >= recentCutoff);
  const recentAverageAccuracy = average(recentScores.map(score => score.accuracy));
  const recentAverageStars = average(recentScores.map(score => score.stars));

  return {
    rankedScoreCount: scores.length,
    weightedPpTotal: round(weightedPpTotal),
    topScorePp: {
      top1: topPp(1),
      top10: topPp(10),
      top25: topPp(25),
      top50: topPp(50),
      top100: topPp(100),
    },
    rawPpForOneWeightedPp: round(ScoreSaberCurve.calcRawPpForExpectedPp(ppsDescending, 1)),
    starBuckets,
    recent: {
      days: RECENT_DAYS,
      scoreCount: recentScores.length,
      averageAccuracy: recentAverageAccuracy === null ? null : round(recentAverageAccuracy),
      averageStars: recentAverageStars === null ? null : round(recentAverageStars),
    },
  };
}

/**
 * Calculates the raw pp of each accuracy on a map of the given stars, and the weighted pp it would add to
 * a player's pp list.
 *
 * @param input.stars the map's star rating
 * @param input.accuracies accuracies as percents
 * @param input.pps the player's raw pps, highest first, or null to skip the weighted gain
 * @param input.currentPp the pp of the player's existing score on the map, or null for a new score
 */
export function calculatePpRows(input: {
  stars: number;
  accuracies: number[];
  pps: number[] | null;
  currentPp: number | null;
}) {
  const gain = input.pps === null ? null : new WeightedGain(input.pps);
  return input.accuracies.map(accuracy => {
    const rawPp = ScoreSaberCurve.getPp(input.stars, accuracy);
    let weightedGain: number | null = null;
    if (gain !== null) {
      weightedGain = input.currentPp === null ? gain.add(rawPp) : gain.replace(input.currentPp, rawPp);
    }
    return {
      accuracy,
      ...classifyAccuracy(accuracy, input.stars, null),
      rawPp: round(rawPp),
      weightedGain: weightedGain === null ? null : round(weightedGain),
    };
  });
}
