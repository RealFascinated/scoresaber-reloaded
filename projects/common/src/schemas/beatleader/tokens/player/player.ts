import { z } from "zod";

export const BeatLeaderPlayerSchema = z
  .object({
    id: z.string(),
    platform: z.string(),
    country: z.string(),
    avatar: z.string().nullable().optional(),
    pp: z.number(),
    rank: z.number(),
    countryRank: z.number(),
    name: z.string(),
  })
  .loose();

export type BeatLeaderPlayerToken = z.infer<typeof BeatLeaderPlayerSchema>;
