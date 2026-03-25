import { z } from "zod";
import { BeatLeaderMetadataSchema } from "../players/metadata";
import { BeatLeaderScoreSchema } from "./score";

export const BeatLeaderPlayerScoresPageSchema = z.object({
  metadata: BeatLeaderMetadataSchema,
  data: z.array(BeatLeaderScoreSchema),
});

export type BeatLeaderPlayerScoresPageToken = z.infer<typeof BeatLeaderPlayerScoresPageSchema>;
