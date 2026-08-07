import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `IdolCanvas` token mirroring the upstream `IdolCanvas` schema. The
 * upstream `player` reference (a full `Player`) is recursive and is omitted.
 */
export const BeatLeaderIdolCanvasSchema = Type.Object({
  id: Type.Number(),
  playerId: Type.Union([Type.String(), Type.Null()]),
  canvasState: Type.String(),
  backgroundId: Type.Number(),
  seenIdolIds: Type.Union([Type.String(), Type.Null()]),
  lastUpdated: Type.Number(),
});

export type BeatLeaderIdolCanvasToken = StaticDecode<typeof BeatLeaderIdolCanvasSchema>;
