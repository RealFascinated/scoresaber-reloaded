import { z } from "zod";
import { BeatLeaderSongSchema } from "../score/song";
import { BeatLeaderDifficultySchema } from "./difficulty";

export const BeatLeaderLeaderboardSchema = z
  .object({
    id: z.string(),
    song: BeatLeaderSongSchema,
    difficulty: BeatLeaderDifficultySchema,
    scores: z.null(),
    changes: z.null(),
    qualification: z.null(),
    reweight: z.null(),
    leaderboardGroup: z.null(),
    plays: z.number(),
    clan: z.null(),
    clanRankingContested: z.boolean(),
  })
  .passthrough();

export type BeatLeaderLeaderboardToken = z.infer<typeof BeatLeaderLeaderboardSchema>;
