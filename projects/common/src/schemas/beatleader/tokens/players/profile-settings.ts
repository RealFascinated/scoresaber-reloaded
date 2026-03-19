import { z } from "zod";

export const BeatLeaderProfileSettingsSchema = z
  .object({
    profileAppearance: z.number(),
    hue: z.number(),
    saturation: z.number(),
    leftSaberColor: z.string(),
    rightSaberColor: z.string(),
    profileCover: z.string(),
    starredFriends: z.string().nullable(),
    horizontalRichBio: z.boolean(),
    rankedMapperSort: z.number(),
    showBots: z.boolean(),
    showAllRatings: z.boolean(),
  })
  .passthrough();

export type BeatLeaderProfileSettingsToken = z.infer<typeof BeatLeaderProfileSettingsSchema>;

// Backwards-compatible aliases
export const BeatLeaderPlayersProfileSettingsSchema = BeatLeaderProfileSettingsSchema;
export type BeatLeaderPlayersProfileSettingsToken = BeatLeaderProfileSettingsToken;
