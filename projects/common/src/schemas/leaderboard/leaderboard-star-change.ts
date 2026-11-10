import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../date";

export const LeaderboardStarChangeSchema = Type.Object({
  previousStars: Type.Number(),
  newStars: Type.Number(),
  timestamp: DateSchema,
});

export type LeaderboardStarChange = StaticDecode<typeof LeaderboardStarChangeSchema>;
