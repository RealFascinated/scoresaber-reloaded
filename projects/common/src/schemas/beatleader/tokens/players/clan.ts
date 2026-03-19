import { z } from "zod";

export const BeatLeaderClanSchema = z
  .object({
    id: z.number(),
    tag: z.string(),
    color: z.string().nullable().optional(),
    name: z.string().nullable(),
  })
  .passthrough();

export type BeatLeaderClanToken = z.infer<typeof BeatLeaderClanSchema>;

// Backwards-compatible aliases
export const BeatLeaderPlayerClanSchema = BeatLeaderClanSchema;
export type BeatLeaderPlayerClan = BeatLeaderClanToken;
