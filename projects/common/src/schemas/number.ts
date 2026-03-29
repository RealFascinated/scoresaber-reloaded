import { z } from "zod";

/**
 * Zod 4's {@link z.number} rejects ±Infinity and NaN. ScoreSaber accuracy uses
 * `Infinity` when `maxScore` is 0 (see getScoreSaberScoreFromToken).
 */
export const numberIncludingInfinitySchema = z.custom<number>(
  (val): val is number => typeof val === "number" && !Number.isNaN(val)
);
