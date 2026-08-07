import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `PlayerChange` token mirroring the upstream `PlayerChange` schema.
 */
export const BeatLeaderPlayerChangeSchema = Type.Object({
  id: Type.Number(),
  timestamp: Type.Number(),
  playerId: Type.Union([Type.String(), Type.Null()]),
  oldName: Type.Union([Type.String(), Type.Null()]),
  newName: Type.Union([Type.String(), Type.Null()]),
  oldCountry: Type.Union([Type.String(), Type.Null()]),
  newCountry: Type.Union([Type.String(), Type.Null()]),
  changer: Type.Union([Type.String(), Type.Null()]),
});

export type BeatLeaderPlayerChangeToken = StaticDecode<typeof BeatLeaderPlayerChangeSchema>;
