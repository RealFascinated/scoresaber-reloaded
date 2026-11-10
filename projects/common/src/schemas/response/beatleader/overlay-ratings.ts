import { Type, type StaticDecode } from "typebox";

const NullableNumberSchema = Type.Union([Type.Number(), Type.Null()]);

export const BeatLeaderOverlayRatingsResponseSchema = Type.Object({
  /** True when the difficulty is ranked on BeatLeader, which is when it gives pp. */
  ranked: Type.Boolean(),
  stars: NullableNumberSchema,
  accRating: NullableNumberSchema,
  passRating: NullableNumberSchema,
  techRating: NullableNumberSchema,
  predictedAcc: NullableNumberSchema,
  sliderPercentage: NullableNumberSchema,
  notes: NullableNumberSchema,
  /** Only difficulties with the rebalanced ratings have this. */
  noteSpan: NullableNumberSchema,
});
export type BeatLeaderOverlayRatingsResponse = StaticDecode<typeof BeatLeaderOverlayRatingsResponseSchema>;

export const BeatLeaderOverlayPlayerResponseSchema = Type.Object({
  pp: Type.Number(),
  rank: Type.Number(),
  countryRank: Type.Number(),
});
export type BeatLeaderOverlayPlayerResponse = StaticDecode<typeof BeatLeaderOverlayPlayerResponseSchema>;
