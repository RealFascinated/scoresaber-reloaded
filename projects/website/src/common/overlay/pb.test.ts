import { describe, expect, test } from "bun:test";
import { formatAccuracyDelta, getPbAccuracyAt } from "./pb";

const pb = {
  scoreId: 1,
  source: "replay" as const,
  finalAccuracy: 98,
  accuracyBySecond: [null, null, 95, 96, 98],
};

describe("getPbAccuracyAt", () => {
  test("is undefined before the first note and without data", () => {
    expect(getPbAccuracyAt(pb, 0.5)).toBeUndefined();
    expect(getPbAccuracyAt(undefined, 3)).toBeUndefined();
    expect(getPbAccuracyAt(pb, undefined)).toBeUndefined();
  });

  test("interpolates between seconds and stops at the end", () => {
    expect(getPbAccuracyAt(pb, 2)).toBe(95);
    expect(getPbAccuracyAt(pb, 2.5)).toBeCloseTo(95.5);
    expect(getPbAccuracyAt(pb, 99)).toBe(98);
  });

  test("uses the final accuracy when there is no replay", () => {
    expect(getPbAccuracyAt({ ...pb, source: "final-only", accuracyBySecond: [] }, 12)).toBe(98);
  });
});

describe("formatAccuracyDelta", () => {
  test("always shows the sign", () => {
    expect(formatAccuracyDelta(0.456, 2)).toBe("+0.46%");
    expect(formatAccuracyDelta(-1.2, 1)).toBe("-1.2%");
    expect(formatAccuracyDelta(-0.001, 2)).toBe("+0.00%");
  });
});
