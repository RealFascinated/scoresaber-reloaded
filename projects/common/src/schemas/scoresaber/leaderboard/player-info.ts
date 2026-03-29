import { z } from "zod";

export const ScoreSaberLeaderboardPlayerInfoSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  profilePicture: z.string().nullable(),
  country: z.string().nullable(),
});

export type ScoreSaberLeaderboardPlayerInfo = z.infer<typeof ScoreSaberLeaderboardPlayerInfoSchema>;
