import { describe, expect, test } from "bun:test";
import type { ReweightStarChangeRow } from "../../../src/repositories/scoresaber-reweight.repository";
import {
  aggregateLeaderboardChanges,
  calculatePlayerPpChange,
  getMergeCutoff,
  getReweightName,
  hasPpChanged,
  PP_CHANGE_EPSILON,
  REWEIGHT_MERGE_WINDOW_MS,
} from "../../../src/service/reweight/reweight-calculations";

function starChange(overrides: Partial<ReweightStarChangeRow> = {}): ReweightStarChangeRow {
  return {
    leaderboardId: 1,
    songHash: "hash",
    songName: "Song",
    songSubName: "",
    songAuthorName: "Author",
    levelAuthorName: "Mapper",
    difficulty: "ExpertPlus",
    characteristic: "Standard",
    previousStars: 8,
    newStars: 9,
    timestamp: new Date("2026-01-10T00:00:00.000Z"),
    ...overrides,
  };
}

describe("getMergeCutoff", () => {
  test("is the merge window before the timestamp", () => {
    const timestamp = new Date("2026-01-10T12:00:00.000Z");
    expect(getMergeCutoff(timestamp).getTime()).toBe(timestamp.getTime() - REWEIGHT_MERGE_WINDOW_MS);
  });

  test("covers three days", () => {
    expect(REWEIGHT_MERGE_WINDOW_MS).toBe(3 * 24 * 60 * 60 * 1000);
  });
});

describe("getReweightName", () => {
  test("generates a name from the start month in UTC", () => {
    expect(getReweightName(null, new Date("2026-01-15T10:00:00.000Z"))).toBe("January 2026 Reweight");
    expect(getReweightName(null, new Date("2026-01-31T23:59:59.000Z"))).toBe("January 2026 Reweight");
    expect(getReweightName(null, new Date("2026-02-01T00:00:00.000Z"))).toBe("February 2026 Reweight");
  });

  test("prefers the stored name", () => {
    expect(getReweightName("The Big One", new Date("2026-01-15T10:00:00.000Z"))).toBe("The Big One");
  });
});

describe("hasPpChanged", () => {
  test("detects gains and losses", () => {
    expect(hasPpChanged({ ppBefore: 100, ppAfter: 110 })).toBe(true);
    expect(hasPpChanged({ ppBefore: 110, ppAfter: 100 })).toBe(true);
  });

  test("ignores identical pp and rounding noise", () => {
    expect(hasPpChanged({ ppBefore: 100, ppAfter: 100 })).toBe(false);
    expect(hasPpChanged({ ppBefore: 100, ppAfter: 100 + PP_CHANGE_EPSILON / 2 })).toBe(false);
  });

  test("detects a score that stopped being worth pp", () => {
    expect(hasPpChanged({ ppBefore: 50, ppAfter: 0 })).toBe(true);
  });
});

describe("aggregateLeaderboardChanges", () => {
  test("returns nothing for no changes", () => {
    expect(aggregateLeaderboardChanges([])).toEqual([]);
  });

  test("collapses repeated changes of a map to its first previous and last new stars", () => {
    const result = aggregateLeaderboardChanges([
      starChange({ leaderboardId: 1, previousStars: 8, newStars: 9 }),
      starChange({ leaderboardId: 1, previousStars: 9, newStars: 9.5 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.previousStars).toBe(8);
    expect(result[0]?.newStars).toBe(9.5);
  });

  test("orders the biggest star gains first and the biggest drops last, then by id", () => {
    const result = aggregateLeaderboardChanges([
      starChange({ leaderboardId: 3, previousStars: 5, newStars: 5.5 }),
      starChange({ leaderboardId: 2, previousStars: 7, newStars: 5 }),
      starChange({ leaderboardId: 1, previousStars: 6, newStars: 6.5 }),
    ]);

    expect(result.map(change => change.leaderboardId)).toEqual([1, 3, 2]);
  });

  test("does not leak the timestamp into the response", () => {
    const [change] = aggregateLeaderboardChanges([starChange()]);
    expect(change).not.toHaveProperty("timestamp");
  });
});

describe("calculatePlayerPpChange", () => {
  test("is zero for a player without changes", () => {
    expect(calculatePlayerPpChange([100, 90], [])).toEqual({
      ppBefore: 100 + 0.965 * 90,
      ppAfter: 100 + 0.965 * 90,
      ppDelta: 0,
    });
  });

  test("weights a gained score by its new position", () => {
    // before: 100, 50 -> 100 + 0.965 * 50; after: 150, 100 -> 150 + 0.965 * 100
    const result = calculatePlayerPpChange([100], [{ ppBefore: 50, ppAfter: 150 }]);

    expect(result.ppBefore).toBeCloseTo(100 + 0.965 * 50, 6);
    expect(result.ppAfter).toBeCloseTo(150 + 0.965 * 100, 6);
    expect(result.ppDelta).toBeCloseTo(98.25, 6);
  });

  test("weights a lost score by its new position", () => {
    // before: 250, 100 -> 250 + 96.5; after: 100, 80 -> 100 + 0.965 * 80
    const result = calculatePlayerPpChange([100], [{ ppBefore: 250, ppAfter: 80 }]);

    expect(result.ppBefore).toBeCloseTo(250 + 0.965 * 100, 6);
    expect(result.ppAfter).toBeCloseTo(100 + 0.965 * 80, 6);
    expect(result.ppDelta).toBeLessThan(0);
  });

  test("drops scores that are worth no pp on one side", () => {
    const result = calculatePlayerPpChange([], [{ ppBefore: 0, ppAfter: 120 }]);

    expect(result.ppBefore).toBe(0);
    expect(result.ppAfter).toBeCloseTo(120, 6);
    expect(result.ppDelta).toBeCloseTo(120, 6);

    const lost = calculatePlayerPpChange([], [{ ppBefore: 120, ppAfter: 0 }]);
    expect(lost.ppAfter).toBe(0);
    expect(lost.ppDelta).toBeCloseTo(-120, 6);
  });

  test("handles several changed scores at once", () => {
    const result = calculatePlayerPpChange(
      [200],
      [
        { ppBefore: 100, ppAfter: 300 },
        { ppBefore: 300, ppAfter: 100 },
      ]
    );

    // before: 300, 200, 100 ; after: 300, 200, 100 -> the two swapped scores cancel out
    expect(result.ppDelta).toBeCloseTo(0, 6);
  });

  test("does not depend on the order of its input", () => {
    const a = calculatePlayerPpChange([10, 300, 40], [{ ppBefore: 20, ppAfter: 60 }]);
    const b = calculatePlayerPpChange([300, 40, 10], [{ ppBefore: 20, ppAfter: 60 }]);

    expect(a).toEqual(b);
  });
});
