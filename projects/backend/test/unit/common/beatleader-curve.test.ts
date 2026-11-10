import { BeatLeaderCurve, type BeatLeaderPpDifficulty } from "@ssr/common/leaderboard-curve/beatleader-curve";
import { describe, expect, it } from "bun:test";

// A ranked map with the rebalanced ratings, and a real score on it (BeatLeader API, no modifiers)
const REBALANCED: BeatLeaderPpDifficulty = {
  accRating: 15.981133,
  passRating: 18.005373,
  techRating: 7.8189545,
  predictedAcc: 0.961743,
  sliderPercentage: 0.0056550046,
  notes: 2275,
  noteSpan: 180,
};

const LEGACY: BeatLeaderPpDifficulty = { accRating: 5.1148906, passRating: 2.8895774, techRating: 2.8441157 };

describe("BeatLeaderCurve", () => {
  it("matches the pp BeatLeader gives a real score", () => {
    const pp = BeatLeaderCurve.createCalculator(REBALANCED)(0.9449365);
    expect(pp).toBeCloseTo(715.32306, 2);
  });

  it("gives more pp for a higher accuracy", () => {
    for (const difficulty of [REBALANCED, LEGACY]) {
      const calculate = BeatLeaderCurve.createCalculator(difficulty);
      const pps = [0.8, 0.9, 0.95, 0.97, 0.99, 1].map(calculate);
      expect([...pps].sort((a, b) => a - b)).toEqual(pps);
    }
  });

  it("gives no pp for an accuracy outside of 0-1", () => {
    const calculate = BeatLeaderCurve.createCalculator(REBALANCED);
    expect(calculate(0)).toBe(0);
    expect(calculate(1.2)).toBe(0);
  });
});
