import { z } from "zod";

export const ScoreSaberLeaderboardPlayerInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  profilePicture: z.string().optional(),
  country: z.string().optional(),
});

export type ScoreSaberLeaderboardPlayerInfo = z.infer<typeof ScoreSaberLeaderboardPlayerInfoSchema>;
