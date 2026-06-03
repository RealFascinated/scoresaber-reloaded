import { z } from "zod";
import { env } from "../../../env";

export const ScoreSaberLeaderboardPlayerInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  country: z.string().optional(),
  role: z.string().nullish(),
  avatar: z
    .string()
    .nullish()
    .transform(avatar => avatar ?? env.NEXT_PUBLIC_WEBSITE_URL + "/assets/unknown.png"),
});

export type ScoreSaberLeaderboardPlayerInfo = z.infer<typeof ScoreSaberLeaderboardPlayerInfoSchema>;
