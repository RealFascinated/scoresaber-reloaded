import { z } from "zod";
import { BeatLeaderSongSchema } from "../score/song";
import { BeatLeaderDifficultySchema } from "./difficulty";

/** Player /scores and similar endpoints often return only id + song + difficulty. */
export const BeatLeaderLeaderboardSchema = z
  .object({
    id: z.string(),
    song: BeatLeaderSongSchema,
    difficulty: BeatLeaderDifficultySchema,
  })
  .passthrough();

export type BeatLeaderLeaderboardToken = z.infer<typeof BeatLeaderLeaderboardSchema>;
