import { Type, type StaticDecode } from "@sinclair/typebox";

export const LeaderboardStarChangeSchema = Type.Object({
  previousStars: Type.Number(),
  newStars: Type.Number(),
  timestamp: Type.Date(),
});

export type LeaderboardStarChange = StaticDecode<typeof LeaderboardStarChangeSchema>;
