import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderMetadataSchema } from "../players/metadata";
import { BeatLeaderScoreSchema } from "./score";

export const BeatLeaderPlayerScoresPageSchema = Type.Object({
  metadata: BeatLeaderMetadataSchema,
  data: Type.Array(BeatLeaderScoreSchema),
});

export type BeatLeaderPlayerScoresPageToken = StaticDecode<typeof BeatLeaderPlayerScoresPageSchema>;
