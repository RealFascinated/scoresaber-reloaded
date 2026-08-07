import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `ReplayOffsets` token mirroring the upstream `ReplayOffsets` schema.
 * `saberOffsets` and `customData` are newer upstream fields returned by the API.
 */
export const BeatLeaderScoreOffsetsSchema = Type.Object({
  id: Type.Number(),
  frames: Type.Number(),
  notes: Type.Number(),
  walls: Type.Number(),
  heights: Type.Number(),
  pauses: Type.Number(),
  saberOffsets: Type.Optional(Type.Number()),
  customData: Type.Optional(Type.Number()),
});

export type BeatLeaderScoreOffsetsToken = StaticDecode<typeof BeatLeaderScoreOffsetsSchema>;
