import { z } from "zod";
import { BeatLeaderClanSchema } from "./clan";
import { BeatLeaderProfileSettingsSchema } from "./profile-settings";
import { BeatLeaderPlayerScoreStatsSchema } from "./score-stats";

/**
 * Linked platform account IDs for a BeatLeader player. IDs can be returned as
 * strings or numbers depending on the platform, so each is coerced to a string.
 * BeatLeader supports Steam, Oculus PC and Quest accounts only.
 */
export const BeatLeaderLinkedIdsSchema = z
  .object({
    steamId: z.union([z.string(), z.number()]).nullable().optional(),
    oculusPCId: z.union([z.string(), z.number()]).nullable().optional(),
    questId: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .loose();

export type BeatLeaderLinkedIdsToken = z.infer<typeof BeatLeaderLinkedIdsSchema>;

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
    linkedIds: BeatLeaderLinkedIdsSchema.nullable().optional(),
  })
  .loose();

export type BeatLeaderPlayerResponseToken = z.infer<typeof BeatLeaderPlayerResponseSchema>;

/**
 * Minimal parser for `GET /player/{id}` responses. The endpoint's response shape is
 * loose (e.g. `role` is a string, `socials` are objects, `clan` is often absent), so
 * only the fields we rely on are validated.
 */
export const BeatLeaderPlayerLookupSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    platform: z.string(),
    linkedIds: BeatLeaderLinkedIdsSchema.nullable().optional(),
  })
  .loose();

export type BeatLeaderPlayerLookupToken = z.infer<typeof BeatLeaderPlayerLookupSchema>;

// Backwards-compatible aliases
export const BeatLeaderPlayersPlayerSchema = BeatLeaderPlayerResponseSchema;
export type BeatLeaderPlayersPlayerToken = BeatLeaderPlayerResponseToken;
