import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `EarthDayMap` token mirroring the upstream `EarthDayMap` schema.
 */
export const BeatLeaderEarthDayMapSchema = Type.Object({
  id: Type.Number(),
  hash: Type.String(),
  timeset: Type.Number(),
  playerId: Type.String(),
});

export type BeatLeaderEarthDayMapToken = StaticDecode<typeof BeatLeaderEarthDayMapSchema>;
