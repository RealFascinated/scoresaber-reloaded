import { z } from "zod";
import type { BeatLeaderScore } from "../../../../model/beatleader-score/beatleader-score";
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
});

export type AccSaberScore = z.infer<typeof accSaberScoreSchema>;

/**
 * BeatLeader payloads are validated at persistence; this optional field is typed for consumers.
 */
export const enrichedAccSaberScoreSchema = accSaberScoreSchema.extend({
  beatLeaderScore: z.optional(z.custom<BeatLeaderScore>((val): val is BeatLeaderScore => true)),
});

export type EnrichedAccSaberScore = z.infer<typeof enrichedAccSaberScoreSchema>;
