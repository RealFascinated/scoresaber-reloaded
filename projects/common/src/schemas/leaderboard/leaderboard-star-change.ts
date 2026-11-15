import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../date";

export const LeaderboardStarChangeSchema = Type.Object({
  previousStars: Type.Number(),
  newStars: Type.Number(),
  timestamp: DateSchema,
  /** The ranked batch this change belongs to, if it was recorded as part of one. */
  rankedBatchId: Type.Optional(Type.Integer()),
});

export type LeaderboardStarChange = StaticDecode<typeof LeaderboardStarChangeSchema>;
