import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `Mapper` token mirroring the upstream `Mapper` schema. `status` is
 * serialized as a number by the API even though the generated OpenAPI documents
 * it as a string. The upstream `songs` (array of `Song`) and `player` (`Player`)
 * references are recursive and are omitted.
 */
export const BeatLeaderMapperSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  avatar: Type.String(),
  curator: Type.Union([Type.Boolean(), Type.Null()]),
  verifiedMapper: Type.Boolean(),
  playlistUrl: Type.Union([Type.String(), Type.Null()]),
  status: Type.Number(),
});

export type BeatLeaderMapperToken = StaticDecode<typeof BeatLeaderMapperSchema>;
