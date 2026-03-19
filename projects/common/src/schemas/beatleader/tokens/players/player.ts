import { z } from "zod";
import { BeatLeaderPlayerScoreStatsSchema } from "./score-stats";
import { BeatLeaderProfileSettingsSchema } from "./profile-settings";
import { BeatLeaderClanSchema } from "./clan";

export const BeatLeaderPlayerResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    platform: z.string(),
    avatar: z.string(),
    country: z.string(),
    alias: z.string(),
    pp: z.number(),
    rank: z.number(),
    countryRank: z.number(),
    role: z.array(z.string()),
    socials: z.array(z.string()),
    contextExtensions: z.array(z.string()),
    patreonFeatures: z.array(z.string()),
    profileSettings: BeatLeaderProfileSettingsSchema,
    clan: BeatLeaderClanSchema.nullable(),
    bot: z.boolean(),
    banned: z.boolean(),
    inactive: z.boolean(),
    externalProfileUrl: z.string().nullable(),
    scoreStats: BeatLeaderPlayerScoreStatsSchema,
  })
  .passthrough();

export type BeatLeaderPlayerResponseToken = z.infer<typeof BeatLeaderPlayerResponseSchema>;

// Backwards-compatible aliases
export const BeatLeaderPlayersPlayerSchema = BeatLeaderPlayerResponseSchema;
export type BeatLeaderPlayersPlayerToken = BeatLeaderPlayerResponseToken;
