import { z } from "zod";

export const ScoreSaberLeaderboardPlayerInfoSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
    role: z.string().optional(),
    avatar: z.string().transform(avatar => avatar ?? "https://cdn.fascinated.cc/assets/unknown.png"),
  });

export type ScoreSaberLeaderboardPlayerInfo = z.infer<typeof ScoreSaberLeaderboardPlayerInfoSchema>;
