import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import {
  DEFAULT_SUGGESTED_MAPS_PARAMS,
  SUGGESTED_MAPS_FEATURE_COUNT,
  accuracyToLogit,
  buildMapFeatures,
  estimatePlayerSkill,
  fitSuggestedMapsModel,
  logitToAccuracy,
  predictAccuracy,
} from "@ssr/common/suggested-maps/suggested-maps-model";
import { describe, expect, it } from "bun:test";
import { buildSuggestedMapsPlaylist } from "../../../src/service/playlist/suggested-maps-playlist";
import {
  WeightedGain,
  bonusFactor,
  derivePlayerRanges,
  derivePlayerStyle,
  expectedAccuracyOnPlayed,
} from "../../../src/service/suggested-maps/suggested-maps-ranking";

function rng(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe("suggested maps model", () => {
  it("round trips accuracy through the logit", () => {
    expect(logitToAccuracy(accuracyToLogit(97.5, DEFAULT_SUGGESTED_MAPS_PARAMS))).toBeCloseTo(97.5, 6);
  });

  it("recovers which maps are easier than their stars suggest", () => {
    const random = rng(7);
    const mapCount = 40;
    const playerCount = 300;
    const stars = Array.from({ length: mapCount }, (_, i) => 4 + (i % 8) * 0.3);
    const trueEase = stars.map((_, i) => (i % 5 === 0 ? 0.5 : 0));
    const skills = Array.from({ length: playerCount }, () => 3 + random() * 1.5);

    const playerIdx: number[] = [];
    const mapIdx: number[] = [];
    const y: number[] = [];
    for (let p = 0; p < playerCount; p++) {
      for (let m = 0; m < mapCount; m++) {
        if (random() < 0.6) {
          playerIdx.push(p);
          mapIdx.push(m);
          y.push(skills[p] + trueEase[m] + (random() - 0.5) * 0.2);
        }
      }
    }
    const mapFeatures = new Float64Array(mapCount * SUGGESTED_MAPS_FEATURE_COUNT);
    stars.forEach((s, m) => mapFeatures.set(buildMapFeatures(s), m * SUGGESTED_MAPS_FEATURE_COUNT));

    const model = fitSuggestedMapsModel(
      {
        playerCount,
        mapCount,
        playerIdx: Int32Array.from(playerIdx),
        mapIdx: Int32Array.from(mapIdx),
        y: Float32Array.from(y),
        mapStars: Float64Array.from(stars),
        mapFeatures,
      },
      DEFAULT_SUGGESTED_MAPS_PARAMS
    );

    const easy = [...model.ease].filter((_, m) => m % 5 === 0);
    const rest = [...model.ease].filter((_, m) => m % 5 !== 0);
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean(easy) - mean(rest)).toBeGreaterThan(0.4);
    expect(mean(easy) - mean(rest)).toBeLessThan(0.6);
  });

  it("estimates a player's skill from their scores", () => {
    const scores = Array.from({ length: 50 }, () => ({
      ease: 0.2,
      stars: 5,
      accuracy: logitToAccuracy(3.2 + 0.2),
    }));
    const fit = estimatePlayerSkill(scores, DEFAULT_SUGGESTED_MAPS_PARAMS);
    expect(fit.skill).toBeGreaterThan(2.95);
    expect(fit.skill).toBeLessThan(3.25);
    expect(Math.abs(predictAccuracy(fit.skill, fit.slope, 5, 0.2) - logitToAccuracy(3.4))).toBeLessThan(1);
  });
});

describe("WeightedGain", () => {
  const pps = [400, 380, 360, 340, 320];
  const total = (list: number[]) => ScoreSaberCurve.getTotalWeightedPp(list);

  it("matches inserting a score into the sorted list", () => {
    const gain = new WeightedGain(pps);
    for (const pp of [500, 390, 330, 100]) {
      const inserted = [...pps, pp].sort((a, b) => b - a);
      expect(gain.add(pp)).toBeCloseTo(total(inserted) - total(pps), 6);
    }
  });

  it("matches replacing an existing score", () => {
    const gain = new WeightedGain(pps);
    const replaced = [...pps.filter(pp => pp !== 340), 410].sort((a, b) => b - a);
    expect(gain.replace(340, 410)).toBeCloseTo(total(replaced) - total(pps), 6);
  });

  it("gains nothing from a worse replacement", () => {
    expect(new WeightedGain(pps).replace(340, 300)).toBe(0);
  });
});

describe("derivePlayerRanges", () => {
  const map = (stars: number, ageDays: number, seconds = 120, nps = 3) => ({ stars, seconds, nps, ageDays });

  it("follows the recent play style and tolerates a few outliers", () => {
    const recent = Array.from({ length: 60 }, (_, i) => map(4 + (i % 10) / 10, 5 + i));
    const outliers = [map(9, 10), ...Array.from({ length: 3 }, () => map(11, 700))];
    const ranges = derivePlayerRanges([...recent.slice(0, 20), ...outliers, ...recent.slice(20)]);
    expect(ranges).not.toBeNull();
    expect(ranges!.minStars).toBeCloseTo(3.6, 1);
    expect(ranges!.maxStars).toBeLessThan(5.6);
    expect(ranges!.maxStars).toBeGreaterThan(4.8);
  });

  it("moves with the player when their style changes", () => {
    const old = Array.from({ length: 40 }, (_, i) => map(8 + (i % 5) / 10, 400 + i));
    const now = Array.from({ length: 40 }, (_, i) => map(4 + (i % 5) / 10, 5 + i));
    const ranges = derivePlayerRanges([...old, ...now].sort(() => 0));
    expect(ranges!.maxStars).toBeLessThan(6);
  });

  it("returns null with too few scores and ignores unknown lengths", () => {
    expect(derivePlayerRanges([map(5, 1)])).toBeNull();
    const unknown = Array.from({ length: 30 }, () => map(5, 1, 0, 0));
    const ranges = derivePlayerRanges(unknown);
    expect(ranges!.maxSeconds).toBe(Number.POSITIVE_INFINITY);
    expect(ranges!.maxNps).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("expectedAccuracyOnPlayed", () => {
  it("credits all the improvement on a low pp score and less on a high pp one", () => {
    const low = expectedAccuracyOnPlayed(98.3, { pp: 300, accuracy: 98 }, 300, 390);
    const high = expectedAccuracyOnPlayed(98.3, { pp: 390, accuracy: 98 }, 300, 390);
    expect(low).toBeCloseTo(98.3, 6);
    expect(high).toBeCloseTo(98.12, 2);
    const mid = expectedAccuracyOnPlayed(98.3, { pp: 345, accuracy: 98 }, 300, 390);
    expect(mid).toBeGreaterThan(high);
    expect(mid).toBeLessThan(low);
  });

  it("never expects more than the maximum improvement on a played map", () => {
    expect(expectedAccuracyOnPlayed(99, { pp: 300, accuracy: 96 }, 300, 390)).toBeCloseTo(96.4, 6);
  });

  it("keeps the model prediction when it is below the score", () => {
    expect(expectedAccuracyOnPlayed(97, { pp: 390, accuracy: 98 }, 300, 390)).toBe(97);
  });
});

describe("derivePlayerStyle", () => {
  const played = [
    ...Array.from({ length: 50 }, (_, i) => ({
      stars: 4 + (i % 10) / 10,
      seconds: 120,
      nps: 3,
      ageDays: 10 + i,
      accuracy: 96 + (i % 10) / 5,
    })),
    ...Array.from({ length: 3 }, () => ({ stars: 7, seconds: 120, nps: 3, ageDays: 20, accuracy: 93 })),
  ];

  it("is most familiar where the player plays and less so at the edges", () => {
    const style = derivePlayerStyle(played);
    expect(style.familiarity(4.5, 3)).toBeGreaterThan(0.9);
    expect(style.familiarity(7, 3)).toBeLessThan(0.5);
    expect(style.familiarity(15, 3)).toBeLessThan(0.15);
  });

  it("discounts maps with more stars or notes per second than the player's median", () => {
    const style = derivePlayerStyle(played);
    expect(style.familiarity(4.5, 3)).toBeGreaterThan(style.familiarity(4.5, 6));
    expect(style.familiarity(4.5, 3)).toBeGreaterThan(style.familiarity(5.4, 3));
  });

  it("caps the accuracy at the player's best nearby score plus a margin", () => {
    const style = derivePlayerStyle(played);
    expect(style.ceiling(4.5)).toBeCloseTo(97.8 + 0.1, 1);
    expect(style.ceiling(7)).toBeCloseTo(93.1, 1);
    expect(style.ceiling(14)).toBeNull();
  });
});

describe("bonusFactor", () => {
  it("rewards maps that pay more than their stars and punishes hard ones, within limits", () => {
    expect(bonusFactor(0)).toBe(1);
    expect(bonusFactor(50)).toBeCloseTo(1.5, 6);
    expect(bonusFactor(-30)).toBeCloseTo(0.7, 6);
    expect(bonusFactor(500)).toBe(2);
    expect(bonusFactor(-500)).toBe(0.25);
  });
});

describe("buildSuggestedMapsPlaylist", () => {
  const map = (songHash: string, difficulty: "Easy" | "Expert" | "ExpertPlus") => ({
    songHash,
    songName: `Song ${songHash}`,
    levelAuthorName: "Mapper",
    difficulty,
    characteristic: "Standard" as const,
  });

  it("groups the difficulties of a song at the position of its best map", () => {
    const playlist = buildSuggestedMapsPlaylist(
      "1",
      [map("A", "Expert"), map("B", "Easy"), map("A", "ExpertPlus")],
      { limit: 3, minStars: undefined }
    );
    expect(playlist.songs.map(song => song.hash)).toEqual(["A", "B"]);
    expect(playlist.songs[0].difficulties.map(difficulty => difficulty.difficulty)).toEqual([
      "Expert",
      "ExpertPlus",
    ]);
    expect(playlist.customData?.syncURL).toContain("/playlist/suggested-maps/1.bplist?limit=3");
    expect(playlist.customData?.syncURL).not.toContain("minStars");
  });
});
