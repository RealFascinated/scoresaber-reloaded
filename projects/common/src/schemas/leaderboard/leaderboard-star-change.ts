import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../date";

export const LeaderboardStarChangeSchema = Type.Object({
  previousStars: Type.Number(),
  newStars: Type.Number(),
  timestamp: DateSchema,
  /** The reweight this change belongs to, if it was recorded as part of one. */
  reweightId: Type.Optional(Type.Integer()),
});

export type LeaderboardStarChange = StaticDecode<typeof LeaderboardStarChangeSchema>;
