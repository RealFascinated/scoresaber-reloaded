import { Type } from "@sinclair/typebox";

/**
 * TypeBox's {@link Type.Number} rejects ±Infinity and NaN. ScoreSaber accuracy uses
 * `Infinity` when `maxScore` is 0 (see getScoreSaberScoreFromToken).
 */
export const numberIncludingInfinitySchema = Type.Transform(Type.Unknown())
  .Decode((val): number => {
    if (typeof val !== "number" || Number.isNaN(val)) {
      throw new Error("Expected a number (including ±Infinity)");
    }
    return val;
  })
  .Encode(value => value);

/**
 * Coalesce null from APIs to 0 so PP/weight stay plain numbers in app types.
 */
export const nullToZeroNumberSchema = Type.Transform(Type.Union([Type.Number(), Type.Null()]))
  .Decode((v): number => v ?? 0)
  .Encode(v => v);
