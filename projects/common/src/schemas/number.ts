import { z } from "zod";

/**
 * Zod 4's {@link z.number} rejects ±Infinity and NaN. ScoreSaber accuracy uses
 * `Infinity` when `maxScore` is 0 (see getScoreSaberScoreFromToken).
 */
export const numberIncludingInfinitySchema = z.custom<number>(
  (val): val is number => typeof val === "number" && !Number.isNaN(val)
);

/**
 * Coalesce null from APIs to 0 so PP/weight stay plain numbers in app types.
 */
export const nullToZeroNumberSchema = z.union([z.number(), z.null()]).transform((v): number => v ?? 0);
