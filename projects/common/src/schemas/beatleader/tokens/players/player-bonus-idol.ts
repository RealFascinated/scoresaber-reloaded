import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderIdolDescriptionSchema } from "../score/idol-description";

/**
 * Raw `PlayerBonusIdol` token mirroring the upstream `PlayerBonusIdol` schema.
 * The upstream `player` reference (a full `Player`) is recursive and is omitted.
 */
export const BeatLeaderPlayerBonusIdolSchema = Type.Object({
  id: Type.Number(),
  playerId: Type.Union([Type.String(), Type.Null()]),
  idolDescriptionId: Type.Number(),
  idolDescription: BeatLeaderIdolDescriptionSchema,
  reason: Type.String(),
});

export type BeatLeaderPlayerBonusIdolToken = StaticDecode<typeof BeatLeaderPlayerBonusIdolSchema>;
