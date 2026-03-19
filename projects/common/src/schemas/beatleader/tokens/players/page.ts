import { z } from "zod";
import { BeatLeaderMetadataSchema } from "./metadata";
import { BeatLeaderPlayerResponseSchema } from "./player";

export const BeatLeaderPlayersPageSchema = z.object({
  metadata: BeatLeaderMetadataSchema,
  data: z.array(BeatLeaderPlayerResponseSchema),
});

export const BeatLeaderPlayersTotalSchema = z.object({
  metadata: z.object({
    total: z.number(),
  }),
});

export type BeatLeaderPlayersPage = z.infer<typeof BeatLeaderPlayersPageSchema>;
export type BeatLeaderPlayersTotal = z.infer<typeof BeatLeaderPlayersTotalSchema>;
