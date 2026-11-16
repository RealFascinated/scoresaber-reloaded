import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import type { SuggestedMap } from "@ssr/common/schemas/suggested-maps/suggested-maps";
import {
  accuracyToLogit,
  predictAccuracy,
  type SuggestedMapsParams,
} from "@ssr/common/suggested-maps/suggested-maps-model";

/** Predictions above this accuracy are not believable for anyone, whatever the fitted skill says. */
export const MAX_PREDICTED_ACCURACY = 99.5;

/** Only the best scores matter for the weighted total (0.965^300 is ~0). */
const TOP_SCORES_CONSIDERED = 300;

/** A ranked map with its fitted ease and display data. */
export type RankableMap = Omit<
  SuggestedMap,
  | "predictedAccuracy"
  | "predictedPp"
  | "bonusPp"
  | "weightedGain"
  | "requiredAccuracy"
  | "currentAccuracy"
  | "currentPp"
  | "familiarity"
  | "score"
> & {
  ease: number;
  prior: number;
};

export type PlayerMapScore = { pp: number; accuracy: number };

/** Share of the predicted improvement a played map is credited with when it is already the player's best pp. */
const PLAYED_CREDIT_FLOOR = 0.4;
/** The most accuracy (in percentage points) a suggestion expects the player to add to a score they already have. */
const MAX_PLAYED_IMPROVEMENT = 0.4;

/**
 * The accuracy to expect on a map the player already has a score on. Their actual score is stronger evidence
 * than the model, so only part of the predicted improvement counts: all of it when the score is worth no more
 * than the bottom of their pp list (it is as good as unplayed), down to `PLAYED_CREDIT_FLOOR` when it is their
 * best pp. A map the model says the player is worse at than their score keeps the model's value.
 *
 * @param listFloorPp pp of the last score in the player's list
 * @param listTopPp pp of the player's best score
 */
export function expectedAccuracyOnPlayed(
  predicted: number,
  current: PlayerMapScore,
  listFloorPp: number,
  listTopPp: number
): number {
  if (predicted <= current.accuracy) {
    return predicted;
  }
  const span = listTopPp - listFloorPp;
  const position = span > 0 ? Math.min(1, Math.max(0, (current.pp - listFloorPp) / span)) : 1;
  const credit = 1 - (1 - PLAYED_CREDIT_FLOOR) * position;
  return current.accuracy + Math.min(MAX_PLAYED_IMPROVEMENT, credit * (predicted - current.accuracy));
}

export type SuggestedMapsFilters = {
  minStars: number;
  maxStars: number;
  minSeconds: number;
  maxSeconds: number;
  maxNps: number;
  minScores: number;
  hidePlayed: boolean;
  sort: "gain" | "bonus";
  limit: number;
};

export type PlayerRangeFilters = Pick<
  SuggestedMapsFilters,
  "minStars" | "maxStars" | "minSeconds" | "maxSeconds" | "maxNps"
>;

/** Scores a player needs before their own play style is trusted over no filtering. */
const MIN_STYLE_SCORES = 20;
/** Number of the player's best scores that define their style. */
const STYLE_SCORES = 200;
/** A score counts half as much for every this many days of age: the style is what the player plays now. */
const STYLE_HALF_LIFE_DAYS = 45;
/** Each place down the player's pp list multiplies a score's weight by this (the pp weighting itself). */
const STYLE_RANK_DECAY = 0.985;
/** The share of the weight outside the range on each side, so a few outlier maps do not stretch it. */
const STYLE_TAIL = 0.04;

/** The value below which `q` of the total weight lies. */
function weightedQuantile(items: { value: number; weight: number }[], q: number): number {
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= q * total) {
      return item.value;
    }
  }
  return sorted[sorted.length - 1].value;
}

/**
 * Fits the star, length and density ranges to what a player plays right now: the weighted 4th to 96th
 * percentile of their best scores, where recent scores and scores high in their pp list count the most, with
 * a margin. The suggestions then stay on maps like the ones they play today (and inside the stars their skill
 * line is fitted on) with room left for the odd outlier. Returns null when there are too few scores to tell.
 *
 * @param playedMaps the maps of the player's scores, best pp first
 */
export function derivePlayerRanges(
  playedMaps: { stars: number; seconds: number; nps: number; ageDays: number }[]
): PlayerRangeFilters | null {
  const top = playedMaps.slice(0, STYLE_SCORES).map((map, rank) => ({
    ...map,
    weight: Math.pow(0.5, Math.max(0, map.ageDays) / STYLE_HALF_LIFE_DAYS) * Math.pow(STYLE_RANK_DECAY, rank),
  }));
  if (top.length < MIN_STYLE_SCORES) {
    return null;
  }
  const column = (pick: (map: (typeof top)[number]) => number): { value: number; weight: number }[] =>
    top.map(map => ({ value: pick(map), weight: map.weight }));
  // BeatSaver data is missing for some maps (0), which says nothing about the player's style
  const known = (pick: (map: (typeof top)[number]) => number): { value: number; weight: number }[] =>
    column(pick).filter(item => item.value > 0);
  const seconds = known(map => map.seconds);
  const nps = known(map => map.nps);
  const hasSeconds = seconds.length >= MIN_STYLE_SCORES;
  const hasNps = nps.length >= MIN_STYLE_SCORES;
  const stars = column(map => map.stars);
  return {
    minStars: Math.max(0, weightedQuantile(stars, STYLE_TAIL) - 0.4),
    maxStars: weightedQuantile(stars, 1 - STYLE_TAIL) + 0.4,
    minSeconds: hasSeconds ? weightedQuantile(seconds, STYLE_TAIL) * 0.8 : 0,
    maxSeconds: hasSeconds ? weightedQuantile(seconds, 1 - STYLE_TAIL) * 1.25 : Number.POSITIVE_INFINITY,
    maxNps: hasNps ? weightedQuantile(nps, 1 - STYLE_TAIL) * 1.25 : Number.POSITIVE_INFINITY,
  };
}

export type PlayerStyle = {
  ranges: PlayerRangeFilters | null;
  /**
   * 0-1: how close a map is to what the player plays now. It falls where they play little of those stars, and
   * with every star or note density the map is above their median (harder maps cost more effort to land).
   */
  familiarity: (stars: number, nps: number) => number;
  /** The best accuracy the player can be expected to reach at these stars, from their own record. */
  ceiling: (stars: number) => number | null;
  /**
   * Accuracy to add to the model's prediction at these stars so it matches what the player actually gets: the
   * model is fitted over all stars and drifts at the player's own, so this is how far their scores there
   * usually land from it. 0 without enough scores nearby.
   */
  correction: (stars: number) => number;
};

/** Width (in stars) of the neighbourhood that counts as the same kind of map. */
const STYLE_BANDWIDTH = 0.5;
/** Familiarity falls with the density of recent plays raised to this power, never below the floor. */
const FAMILIARITY_POWER = 0.5;
const FAMILIARITY_FLOOR = 0.15;
/** Accuracy a prediction may exceed the player's best nearby score by. */
const CEILING_MARGIN = 0.1;
/** Stars around a map that the player's best accuracy is taken from, widened once when nothing is found. */
const CEILING_RADIUS = 0.75;
const MIN_CEILING_SCORES = 3;
/** Width (in stars) of the scores the prediction correction is taken from. */
const CORRECTION_BANDWIDTH = 0.75;
/** Scores' worth of weight needed nearby before the correction is trusted. */
const MIN_CORRECTION_WEIGHT = 4;
/** Quantile of the nearby residuals the correction uses: just above the middle, a decent attempt. */
const CORRECTION_QUANTILE = 0.55;
/** Lowest accuracy that counts toward the correction; worse scores are fails, not skill. */
const CORRECTION_MIN_ACCURACY = 80;
/** Effort discount: `1 / (1 + EFFORT_PER_STAR * extra stars + EFFORT_PER_NPS_SHARE * extra NPS share)`. */
const EFFORT_PER_STAR = 0.25;
const EFFORT_PER_NPS_SHARE = 0.5;

/**
 * Describes a player's current style for ranking: the ranges they play, how familiar a star level is to them,
 * and the best accuracy they have shown at that level, so suggestions stay realistic and near what they play.
 *
 * @param played the player's scores, best pp first
 */
export function derivePlayerStyle(
  played: {
    stars: number;
    seconds: number;
    nps: number;
    ageDays: number;
    accuracy: number;
    /** Actual accuracy minus the model's prediction for the player on that map. */
    residual?: number;
  }[]
): PlayerStyle {
  const ranges = derivePlayerRanges(played);
  const top = played.slice(0, STYLE_SCORES).map((map, rank) => ({
    stars: map.stars,
    nps: map.nps,
    weight: Math.pow(0.5, Math.max(0, map.ageDays) / STYLE_HALF_LIFE_DAYS) * Math.pow(STYLE_RANK_DECAY, rank),
  }));
  const density = (stars: number): number =>
    top.reduce(
      (sum, map) => sum + map.weight * Math.exp(-0.5 * ((stars - map.stars) / STYLE_BANDWIDTH) ** 2),
      0
    );
  const peak = top.reduce((max, map) => Math.max(max, density(map.stars)), 0);
  const knownNps = top.filter(map => map.nps > 0).map(map => ({ value: map.nps, weight: map.weight }));
  const medianStars =
    top.length > 0
      ? weightedQuantile(
          top.map(map => ({ value: map.stars, weight: map.weight })),
          0.5
        )
      : 0;
  const medianNps = knownNps.length >= MIN_STYLE_SCORES ? weightedQuantile(knownNps, 0.5) : 0;

  return {
    ranges,
    familiarity: (stars, nps) => {
      const common =
        peak > 0
          ? Math.min(1, Math.max(FAMILIARITY_FLOOR, Math.pow(density(stars) / peak, FAMILIARITY_POWER)))
          : 1;
      const extraStars = Math.max(0, stars - medianStars);
      const extraNps = medianNps > 0 && nps > 0 ? Math.max(0, nps / medianNps - 1) : 0;
      return common / (1 + EFFORT_PER_STAR * extraStars + EFFORT_PER_NPS_SHARE * extraNps);
    },
    correction: stars => {
      let kernelTotal = 0;
      const near: { value: number; weight: number }[] = [];
      played.forEach((map, rank) => {
        if (map.residual === undefined || map.accuracy < CORRECTION_MIN_ACCURACY) {
          return;
        }
        const kernel = Math.exp(-0.5 * ((stars - map.stars) / CORRECTION_BANDWIDTH) ** 2);
        if (kernel < 0.01) {
          return;
        }
        kernelTotal += kernel;
        // What the player does now counts most: recent and high pp scores, like the rest of the style.
        const current =
          Math.pow(0.5, Math.max(0, map.ageDays) / STYLE_HALF_LIFE_DAYS) * Math.pow(STYLE_RANK_DECAY, rank);
        near.push({ value: map.residual, weight: kernel * current });
      });
      return kernelTotal >= MIN_CORRECTION_WEIGHT ? weightedQuantile(near, CORRECTION_QUANTILE) : 0;
    },
    ceiling: stars => {
      for (const radius of [CEILING_RADIUS, CEILING_RADIUS * 2]) {
        const near = played.filter(map => Math.abs(map.stars - stars) <= radius);
        if (near.length >= MIN_CEILING_SCORES) {
          return Math.max(...near.map(map => map.accuracy)) + CEILING_MARGIN;
        }
      }
      return null;
    },
  };
}

/** Bonus pp (over a typical map of the same stars) that doubles a map's rank score, and halves it below zero. */
const BONUS_SCALE_PP = 100;
const BONUS_FACTOR_MIN = 0.25;
const BONUS_FACTOR_MAX = 2;

/**
 * The factor a map's bonus pp scales its rank score by: maps that pay more than their stars suggest rank
 * above maps that only pay well because they are hard.
 */
export function bonusFactor(bonusPp: number): number {
  return Math.min(BONUS_FACTOR_MAX, Math.max(BONUS_FACTOR_MIN, 1 + bonusPp / BONUS_SCALE_PP));
}

/**
 * Computes how much weighted pp a new score adds to a pp list, without touching the list.
 */
export class WeightedGain {
  private readonly pps: number[];
  /** weights[i] = 0.965^i */
  private readonly weights: number[];
  /** suffix[i] = sum over j >= i of weights[j] * pps[j] */
  private readonly suffix: number[];

  constructor(ppsDescending: number[]) {
    this.pps = ppsDescending.slice(0, TOP_SCORES_CONSIDERED);
    const n = this.pps.length;
    this.weights = new Array<number>(n + 1);
    this.suffix = new Array<number>(n + 1);
    this.weights[0] = 1;
    for (let i = 1; i <= n; i++) {
      this.weights[i] = this.weights[i - 1] * ScoreSaberCurve.WEIGHT_COEFFICIENT;
    }
    this.suffix[n] = 0;
    for (let i = n - 1; i >= 0; i--) {
      this.suffix[i] = this.suffix[i + 1] + this.weights[i] * this.pps[i];
    }
  }

  /** The weighted pp gained by adding a score of `pp` (a new map). */
  public add(pp: number): number {
    let lo = 0;
    let hi = this.pps.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.pps[mid] >= pp) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return this.weights[lo] * pp + (ScoreSaberCurve.WEIGHT_COEFFICIENT - 1) * this.suffix[lo];
  }

  /** The weighted total of the considered scores. */
  public get total(): number {
    return this.suffix[0];
  }

  /** The weighted pp gained by raising an existing score of `oldPp` to `pp`. */
  public replace(oldPp: number, pp: number): number {
    if (pp <= oldPp) {
      return 0;
    }
    const at = this.pps.indexOf(oldPp);
    if (at === -1) {
      // The old score is below the considered window, so it adds ~nothing to the total.
      return this.add(pp);
    }
    const without = new WeightedGain([...this.pps.slice(0, at), ...this.pps.slice(at + 1)]);
    return without.total + without.add(pp) - this.total;
  }
}

/** The score that counts as "making your list": your 100th best. */
const LIST_SIZE = 100;

/**
 * The lowest accuracy (0-100) at which a map of the given stars pays at least `targetPp`, or null when even
 * a perfect score does not.
 */
export function accuracyForPp(stars: number, targetPp: number): number | null {
  if (targetPp <= 0) {
    return 0;
  }
  if (ScoreSaberCurve.getPp(stars, 100) < targetPp) {
    return null;
  }
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (ScoreSaberCurve.getPp(stars, mid) < targetPp) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hi;
}

/**
 * Ranks the maps for a player (or the reference player) and returns the best `limit`.
 */
export function rankSuggestedMaps(args: {
  maps: RankableMap[];
  skill: number;
  slope: number;
  params: SuggestedMapsParams;
  filters: SuggestedMapsFilters;
  /** The player's scores by leaderboard id, null for the reference player. */
  playerScores: Map<number, PlayerMapScore> | null;
  /** The player's raw pps, highest first. */
  playerPps: number[] | null;
  /** The player's style, null for the reference player. */
  style?: PlayerStyle | null;
}): SuggestedMap[] {
  const { maps, skill, slope, filters, playerScores, playerPps, style } = args;
  const gain = playerPps ? new WeightedGain(playerPps) : null;
  const out: SuggestedMap[] = [];
  const listFloorPp = playerPps ? (playerPps[Math.min(LIST_SIZE, playerPps.length) - 1] ?? 0) : 0;

  for (const map of maps) {
    if (
      map.stars < filters.minStars ||
      map.stars > filters.maxStars ||
      map.scoreCount < filters.minScores ||
      map.nps > filters.maxNps ||
      // Maps without BeatSaber data (0 seconds) can't be length filtered, so they are kept.
      (map.seconds > 0 && (map.seconds < filters.minSeconds || map.seconds > filters.maxSeconds))
    ) {
      continue;
    }
    const current = playerScores?.get(map.leaderboardId) ?? null;
    if (current && filters.hidePlayed) {
      continue;
    }

    // A prediction never goes beyond the best the player has shown on maps of these stars.
    const modelAccuracy = Math.min(
      predictAccuracy(skill, slope, map.stars, map.ease) + (style?.correction(map.stars) ?? 0),
      style?.ceiling(map.stars) ?? MAX_PREDICTED_ACCURACY,
      MAX_PREDICTED_ACCURACY
    );
    const predictedAccuracy = current
      ? expectedAccuracyOnPlayed(modelAccuracy, current, listFloorPp, playerPps?.[0] ?? listFloorPp)
      : modelAccuracy;
    const typicalAccuracy = Math.min(
      predictAccuracy(skill, slope, map.stars, map.prior),
      MAX_PREDICTED_ACCURACY
    );
    const predictedPp = ScoreSaberCurve.getPp(map.stars, predictedAccuracy);
    const bonusPp = predictedPp - ScoreSaberCurve.getPp(map.stars, typicalAccuracy);

    const familiarity = style?.familiarity(map.stars, map.nps) ?? 1;
    let weightedGain: number | null = null;
    if (gain) {
      weightedGain = current ? gain.replace(current.pp, predictedPp) : gain.add(predictedPp);
    }

    out.push({
      leaderboardId: map.leaderboardId,
      songHash: map.songHash,
      songName: map.songName,
      songSubName: map.songSubName,
      songAuthorName: map.songAuthorName,
      levelAuthorName: map.levelAuthorName,
      difficulty: map.difficulty,
      characteristic: map.characteristic,
      stars: map.stars,
      seconds: map.seconds,
      nps: map.nps,
      scoreCount: map.scoreCount,
      predictedAccuracy,
      predictedPp,
      bonusPp,
      weightedGain,
      requiredAccuracy: playerPps ? accuracyForPp(map.stars, listFloorPp) : null,
      currentAccuracy: current?.accuracy ?? null,
      currentPp: current?.pp ?? null,
      familiarity,
      score: weightedGain === null ? bonusPp : weightedGain * familiarity * bonusFactor(bonusPp),
    });
  }

  // Without a player there is no gain; with one, maps that can't beat the list (gain 0) rank by how close
  // the predicted accuracy comes to the accuracy needed.
  const margin = (map: SuggestedMap): number =>
    map.requiredAccuracy === null ? Number.NEGATIVE_INFINITY : map.predictedAccuracy - map.requiredAccuracy;
  out.sort((a, b) => {
    if (filters.sort === "gain" && a.weightedGain !== null && b.weightedGain !== null) {
      return b.score - a.score || margin(b) - margin(a);
    }
    return b.bonusPp - a.bonusPp;
  });
  return out.slice(0, filters.limit);
}

/**
 * The skill of a reference player who gets `accuracy` on a map of 5 stars where players score the typical
 * accuracy for the stars.
 */
export function getReferenceSkill(
  accuracy: number,
  maps: RankableMap[],
  params: SuggestedMapsParams
): number {
  const near = maps.filter(map => map.stars >= 4.5 && map.stars <= 5.5).map(map => map.prior);
  near.sort((a, b) => a - b);
  const typicalPrior = near.length > 0 ? near[near.length >> 1] : 0;
  return accuracyToLogit(accuracy, params) - typicalPrior;
}
