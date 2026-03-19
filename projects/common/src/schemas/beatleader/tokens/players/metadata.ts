import { z } from "zod";

export const BeatLeaderMetadataSchema = z.object({
  itemsPerPage: z.number(),
  page: z.number(),
  total: z.number(),
});

export type BeatLeaderMetadataToken = z.infer<typeof BeatLeaderMetadataSchema>;

// Backwards-compatible aliases
export const BeatLeaderPlayersMetadataSchema = BeatLeaderMetadataSchema;
export type BeatLeaderPlayersMetadata = BeatLeaderMetadataToken;
