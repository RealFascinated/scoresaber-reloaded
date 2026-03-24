import { z } from "zod";
import { accSaberDiffInfoSchema } from "./diff-info";
import { accSaberScoreSongSchema } from "./song";

export const accSaberLeaderboardSchema = z.object({
  leaderboardId: z.number(),
  song: accSaberScoreSongSchema,
  diffInfo: accSaberDiffInfoSchema,
  complexity: z.number(),
  category: z.string(),
});
