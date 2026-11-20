import { describe, expect, it } from "bun:test";
import { buildImprovableScores } from "./improvable-scores";

const scores = [
  { leaderboardId: 1, stars: 5, pp: 400, accuracy: 98.5, fullCombo: true },
  { leaderboardId: 2, stars: 9, pp: 380, accuracy: 94.5, fullCombo: false },
  { leaderboardId: 3, stars: 9.5, pp: 370, accuracy: 95.5, fullCombo: true },
];

describe("buildImprovableScores", () => {
  it("evaluates each score at each accuracy increase and tiers every target", () => {
    const result = buildImprovableScores(scores, { increases: [1] });

    expect(result).toHaveLength(3);
    for (const row of result) {
      expect(row.gains[0].accuracy).toBeGreaterThan(row.accuracy);
      expect(row.gains[0].weightedGain).toBeGreaterThan(0);
      expect(["reachable", "stretch", "elite", "unrealistic"]).toContain(row.gains[0].tier);
    }
  });

  it("ranks by the gain at an accuracy the player has already reached", () => {
    const result = buildImprovableScores(scores, { increases: [1] });
    const realistic = result
      .map(row => row.gainAtBestSimilarAccuracy?.weightedGain ?? 0)
      .filter(gain => gain > 0);

    expect(realistic).toEqual([...realistic].sort((a, b) => b - a));
    expect(result.find(row => row.leaderboardId === 1)?.gains[0].tier).toBe("unrealistic");
  });

  it("caps the target accuracy at 100 and honors the limit", () => {
    const result = buildImprovableScores([{ ...scores[0], accuracy: 99.8 }, scores[1]], {
      limit: 1,
      increases: [5],
    });

    expect(result).toHaveLength(1);
    expect(result[0].gains[0].accuracy).toBe(100);
  });

  it("reports the best accuracy and the gain at it", () => {
    const result = buildImprovableScores(scores);
    const witch = result.find(row => row.leaderboardId === 2);

    expect(witch?.bestAccuracyAtSimilarStars).toBe(95.5);
    expect(witch?.gainAtBestSimilarAccuracy?.accuracy).toBe(95.5);
    expect(witch?.gainAtBestSimilarAccuracy?.weightedGain).toBeGreaterThan(0);
    expect(result.find(row => row.leaderboardId === 3)?.gainAtBestSimilarAccuracy).toBeNull();
    expect(result.find(row => row.leaderboardId === 1)?.bestAccuracyAtSimilarStars).toBeNull();
  });
});
