import { z } from "zod";
import { BeatLeaderScoreSchema } from "../../../beatleader/score/score";
import { accSaberLeaderboardSchema } from "../leaderboard/leaderboard";
import { accSaberScorePayloadSchema } from "./payload";
export { accSaberDiffInfoSchema } from "../leaderboard/diff-info";
export { accSaberLeaderboardSchema } from "../leaderboard/leaderboard";
export { accSaberScoreSongSchema } from "../leaderboard/song";
export { accSaberScorePayloadSchema } from "./payload";

export const accSaberScoreSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  leaderboardId: z.number(),
  timeSet: z.coerce.date(),
  ap: z.number(),
  acc: z.number(),
  leaderboard: accSaberLeaderboardSchema,
  score: accSaberScorePayloadSchema,
  fetchedAt: z.coerce.date(),
  lastUpdated: z.coerce.date(),
  beatLeaderScore: BeatLeaderScoreSchema.optional(),
});

export type AccSaberScore = z.infer<typeof accSaberScoreSchema>;
