export const MEDAL_COUNTS = {
  1: 10,
  2: 8,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
  8: 1,
  9: 1,
  10: 1,
} as const;

export type MedalRank = keyof typeof MEDAL_COUNTS;

/** Ranks 1–10 in order (e.g. SQL `CASE` arms). Keep in sync with `MEDAL_COUNTS` keys. */
export const MEDAL_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const satisfies readonly MedalRank[];
