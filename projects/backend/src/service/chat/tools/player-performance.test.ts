import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { describe, expect, it } from "bun:test";
import { buildPlayerPerformance, calculatePpRows } from "./player-performance";

const NOW = new Date("2026-06-01T00:00:00.000Z");
const DAY_MS = 86_400_000;

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY_MS);
}

function makeScore(input: {
  leaderboardId: number;
  stars: number;
  pp: number;
  accuracy: number;
  fullCombo?: boolean;
  timestamp?: Date;
}) {
  return {
    leaderboardId: input.leaderboardId,
    stars: input.stars,
    pp: input.pp,
    accuracy: input.accuracy,
    fullCombo: input.fullCombo ?? false,
    timestamp: input.timestamp ?? daysAgo(10),
  };
}

describe("buildPlayerPerformance", () => {
  const scores = [
    makeScore({
      leaderboardId: 1,
      stars: 5.2,
      pp: 300,
      accuracy: 97,
      fullCombo: true,
      timestamp: daysAgo(10),
    }),
    makeScore({
      leaderboardId: 2,
      stars: 5.8,
      pp: 280,
      accuracy: 95,
      fullCombo: false,
      timestamp: daysAgo(90),
    }),
    makeScore({
      leaderboardId: 3,
      stars: 6.4,
      pp: 200,
      accuracy: 90,
      fullCombo: true,
      timestamp: daysAgo(30),
    }),
    makeScore({
      leaderboardId: 4,
      stars: 6.9,
      pp: 100,
      accuracy: 88,
      fullCombo: true,
      timestamp: daysAgo(400),
    }),
  ];

  it("groups scores into ascending whole-star buckets", () => {
    const performance = buildPlayerPerformance(scores, NOW);

    expect(performance.starBuckets.map(bucket => bucket.stars)).toEqual(["5-6", "6-7"]);
    expect(performance.starBuckets.map(bucket => bucket.minStars)).toEqual([5, 6]);
    expect(performance.starBuckets.map(bucket => bucket.scoreCount)).toEqual([2, 2]);
  });

  it("summarizes accuracy, pp and full combos per bucket", () => {
    const [lowBucket, highBucket] = buildPlayerPerformance(scores, NOW).starBuckets;

    expect(lowBucket).toEqual({
      stars: "5-6",
      minStars: 5,
      scoreCount: 2,
      averageAccuracy: 96,
      medianAccuracy: 96,
      bestAccuracy: 97,
      bestPp: 300,
      fullComboRate: 0.5,
      inTop50: 2,
      weightedPp: 570.2,
      recentScoreCount: 1,
      recentAverageAccuracy: 97,
    });
    expect(highBucket).toEqual({
      stars: "6-7",
      minStars: 6,
      scoreCount: 2,
      averageAccuracy: 89,
      medianAccuracy: 89,
      bestAccuracy: 90,
      bestPp: 200,
      fullComboRate: 1,
      inTop50: 2,
      weightedPp: 276.11,
      recentScoreCount: 1,
      recentAverageAccuracy: 90,
    });
  });

  it("takes the middle accuracy as the median for an odd count", () => {
    const performance = buildPlayerPerformance(
      [
        makeScore({ leaderboardId: 1, stars: 3.1, pp: 30, accuracy: 91 }),
        makeScore({ leaderboardId: 2, stars: 3.2, pp: 20, accuracy: 99 }),
        makeScore({ leaderboardId: 3, stars: 3.3, pp: 10, accuracy: 95 }),
      ],
      NOW
    );

    expect(performance.starBuckets[0].medianAccuracy).toBe(95);
    expect(performance.starBuckets[0].bestAccuracy).toBe(99);
    expect(performance.starBuckets[0].averageAccuracy).toBe(95);
  });

  it("returns null top thresholds when the player has too few scores", () => {
    const performance = buildPlayerPerformance(scores, NOW);

    expect(performance.rankedScoreCount).toBe(4);
    expect(performance.topScorePp).toEqual({
      top1: 300,
      top10: null,
      top25: null,
      top50: null,
      top100: null,
    });
  });

  it("returns every top threshold once the player has that many scores", () => {
    const manyScores = Array.from({ length: 100 }, (_, index) =>
      makeScore({
        leaderboardId: index + 1,
        stars: 7.5,
        pp: 1000 - index,
        accuracy: 96,
        timestamp: daysAgo(5),
      })
    );

    const performance = buildPlayerPerformance(manyScores, NOW);

    expect(performance.topScorePp).toEqual({
      top1: 1000,
      top10: 991,
      top25: 976,
      top50: 951,
      top100: 901,
    });
    expect(performance.starBuckets[0].inTop50).toBe(50);
  });

  it("sums weighted pp over the pp-descending scores", () => {
    const performance = buildPlayerPerformance(scores, NOW);
    const expected =
      300 +
      280 * ScoreSaberCurve.WEIGHT_COEFFICIENT +
      200 * ScoreSaberCurve.WEIGHT_COEFFICIENT ** 2 +
      100 * ScoreSaberCurve.WEIGHT_COEFFICIENT ** 3;

    expect(performance.weightedPpTotal).toBeCloseTo(expected, 2);
    expect(performance.weightedPpTotal).toBe(846.31);
  });

  it("counts only scores inside the recent window", () => {
    const performance = buildPlayerPerformance(scores, NOW);

    expect(performance.recent).toEqual({
      days: 60,
      scoreCount: 2,
      averageAccuracy: 93.5,
      averageStars: 5.8,
    });
    expect(performance.starBuckets[0].recentScoreCount).toBe(1);
    expect(performance.starBuckets[1].recentScoreCount).toBe(1);
  });

  it("returns null recent values when no score is recent", () => {
    const performance = buildPlayerPerformance(
      [makeScore({ leaderboardId: 1, stars: 4.3, pp: 50, accuracy: 90, timestamp: daysAgo(500) })],
      NOW
    );

    expect(performance.recent).toEqual({
      days: 60,
      scoreCount: 0,
      averageAccuracy: null,
      averageStars: null,
    });
    expect(performance.starBuckets[0].recentAverageAccuracy).toBeNull();
  });
});

describe("calculatePpRows", () => {
  it("turns percents into raw pp with the curve", () => {
    const [row] = calculatePpRows({ stars: 1, accuracies: [95], pps: null, currentPp: null });

    expect(row.accuracy).toBe(95);
    expect(row.rawPp).toBeCloseTo(ScoreSaberCurve.STAR_MULTIPLIER, 2);
  });

  it("leaves the weighted gain null without a pp list", () => {
    const rows = calculatePpRows({ stars: 5, accuracies: [90, 98], pps: null, currentPp: null });

    expect(rows.map(row => row.weightedGain)).toEqual([null, null]);
  });

  it("gains less from replacing an existing score than from a new one", () => {
    const pps = [500, 400, 300];
    const [added] = calculatePpRows({ stars: 5, accuracies: [98], pps, currentPp: null });
    const [replaced] = calculatePpRows({ stars: 5, accuracies: [98], pps, currentPp: 300 });
    expect(added.weightedGain).not.toBeNull();
    expect(replaced.weightedGain).not.toBeNull();
    if (added.weightedGain === null || replaced.weightedGain === null) {
      throw new Error("Expected both scores to gain weighted pp.");
    }

    expect(added.weightedGain).toBeGreaterThan(0);
    expect(replaced.weightedGain).toBeGreaterThan(0);
    expect(replaced.weightedGain).toBeLessThan(added.weightedGain);
  });
});
