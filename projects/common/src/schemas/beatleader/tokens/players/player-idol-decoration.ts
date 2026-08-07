import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderIdolDecorationSchema } from "./idol-decoration";

/**
 * Raw `PlayerIdolDecoration` token mirroring the upstream
 * `PlayerIdolDecoration` schema. The upstream `player` reference (a full
 * `Player`) is recursive and is omitted.
 */
export const BeatLeaderPlayerIdolDecorationSchema = Type.Object({
  id: Type.Number(),
  playerId: Type.Union([Type.String(), Type.Null()]),
  idolDecorationId: Type.Number(),
  idolDecoration: BeatLeaderIdolDecorationSchema,
  reason: Type.String(),
});

export type BeatLeaderPlayerIdolDecorationToken = StaticDecode<typeof BeatLeaderPlayerIdolDecorationSchema>;
