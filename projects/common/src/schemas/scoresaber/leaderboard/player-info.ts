import { z } from "zod";

export const ScoreSaberLeaderboardPlayerInfoSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
    profilePicture: z.string().optional(),
    avatar: z.string().optional(),
  })
  .transform(({ id, name, country, profilePicture, avatar }) => ({
    id,
    name,
    country,
    avatar: avatar ?? profilePicture,
  }));

export type ScoreSaberLeaderboardPlayerInfo = z.infer<typeof ScoreSaberLeaderboardPlayerInfoSchema>;
