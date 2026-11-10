import { Type } from "typebox";

/**
 * TypeBox's {@link Type.Number} rejects ±Infinity and NaN. ScoreSaber accuracy uses
 * `Infinity` when `maxScore` is 0 (see getScoreSaberScoreFromToken).
 */
export const numberIncludingInfinitySchema = Type.Unsafe<number>(
  Type.Refine(
    Type.Unknown(),
    value => typeof value === "number" && !Number.isNaN(value),
    () => "Expected a number (including ±Infinity)"
  )
);

/**
 * Coalesce null from APIs to 0 so PP/weight stay plain numbers in app types.
 */
export const nullToZeroNumberSchema = Type.Codec(Type.Union([Type.Number(), Type.Null()]))
  .Decode((v): number => v ?? 0)
  .Encode(v => v);
