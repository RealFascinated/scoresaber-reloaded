import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderMetadataSchema } from "./metadata";
import { BeatLeaderPlayerResponseSchema } from "./player";

export const BeatLeaderPlayersPageSchema = Type.Object({
  metadata: BeatLeaderMetadataSchema,
  data: Type.Array(BeatLeaderPlayerResponseSchema),
});

export const BeatLeaderPlayersTotalSchema = Type.Object({
  metadata: Type.Object({
    total: Type.Number(),
  }),
});

export type BeatLeaderPlayersPage = StaticDecode<typeof BeatLeaderPlayersPageSchema>;
export type BeatLeaderPlayersTotal = StaticDecode<typeof BeatLeaderPlayersTotalSchema>;
