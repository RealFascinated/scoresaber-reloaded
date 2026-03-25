import { z } from "zod";

export const BeatLeaderScoreOffsetsSchema = z
  .object({
    id: z.number(),
    frames: z.number(),
    notes: z.number(),
    walls: z.number(),
    heights: z.number(),
    pauses: z.number(),
  })
  .loose();

export type BeatLeaderScoreOffsetsToken = z.infer<typeof BeatLeaderScoreOffsetsSchema>;
