import { describe, expect, it } from "bun:test";
import { classifyAccuracy, describeAccuracyRarity, getAccuracyBenchmark } from "./accuracy-benchmarks";

describe("getAccuracyBenchmark", () => {
  it("uses the whole-star bucket and clamps to the known range", () => {
    expect(getAccuracyBenchmark(5.9).starBucket).toBe(5);
    expect(getAccuracyBenchmark(30).starBucket).toBe(14);
    expect(getAccuracyBenchmark(0.2).starBucket).toBe(0);
  });
});

describe("describeAccuracyRarity", () => {
  it("ranks accuracies against the ranked score pool", () => {
    expect(describeAccuracyRarity(70, 5)).toBe("below the median");
    expect(describeAccuracyRarity(90, 5)).toBe("top 50%");
    expect(describeAccuracyRarity(96, 5)).toBe("top 10%");
    expect(describeAccuracyRarity(98.5, 5)).toBe("top 1%");
    expect(describeAccuracyRarity(99.5, 5)).toBe("top 0.1% or rarer");
  });
});

describe("classifyAccuracy", () => {
  it("calls 100% and 99.5% unrealistic regardless of the player", () => {
    expect(classifyAccuracy(100, 6, 99.9).tier).toBe("unrealistic");
    expect(classifyAccuracy(99.5, 5, null).tier).toBe("unrealistic");
  });

  it("calls 99% elite unless the player already reached it", () => {
    expect(classifyAccuracy(99, 5, 98.5).tier).toBe("elite");
    expect(classifyAccuracy(99, 5, 99).tier).toBe("reachable");
  });

  it("treats the top 1% as a stretch and the rest as reachable", () => {
    expect(classifyAccuracy(98.2, 5, 97).tier).toBe("stretch");
    expect(classifyAccuracy(93, 9, 90).tier).toBe("reachable");
  });

  it("is elite at the top 0.1% of a hard bucket even below 99%", () => {
    expect(classifyAccuracy(98.3, 9, 95).tier).toBe("elite");
  });
});
