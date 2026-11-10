import { Type, type StaticDecode } from "typebox";

const NullableNumberSchema = Type.Optional(Type.Union([Type.Number(), Type.Null()]));

/** The ratings of a difficulty in `GET /leaderboards/hash/{hash}`. Only what the overlay needs. */
export const BeatLeaderHashDifficultySchema = Type.Object({
  difficultyName: Type.String(),
  modeName: Type.String(),
  /** 0 unranked, 1 nominated, 2 qualified, 3 ranked, ... */
  status: Type.Number(),
  stars: NullableNumberSchema,
  accRating: NullableNumberSchema,
  passRating: NullableNumberSchema,
  techRating: NullableNumberSchema,
  predictedAcc: NullableNumberSchema,
  sliderPercentage: NullableNumberSchema,
  notes: NullableNumberSchema,
  noteSpan: NullableNumberSchema,
});
export type BeatLeaderHashDifficultyToken = StaticDecode<typeof BeatLeaderHashDifficultySchema>;

/** Parser for `GET /leaderboards/hash/{hash}` (undocumented in the BeatLeader swagger, but stable). */
export const BeatLeaderLeaderboardsByHashSchema = Type.Object({
  leaderboards: Type.Array(Type.Object({ difficulty: BeatLeaderHashDifficultySchema })),
});
export type BeatLeaderLeaderboardsByHashToken = StaticDecode<typeof BeatLeaderLeaderboardsByHashSchema>;
