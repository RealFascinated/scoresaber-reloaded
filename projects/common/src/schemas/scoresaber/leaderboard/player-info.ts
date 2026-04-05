import { z } from "zod";

export const ScoreSaberLeaderboardPlayerInfoSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
    profilePicture: z.string().optional(),
    role: z.string().optional(),
    avatar: z.string(),
  });

export type ScoreSaberLeaderboardPlayerInfo = z.infer<typeof ScoreSaberLeaderboardPlayerInfoSchema>;
