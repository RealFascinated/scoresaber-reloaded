import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `ExternalStatus` token mirroring the upstream `ExternalStatus` schema.
 * `status` is serialized as a number by the API even though the generated
 * OpenAPI documents it as a string.
 */
export const BeatLeaderExternalStatusSchema = Type.Object({
  id: Type.Number(),
  status: Type.Number(),
  timeset: Type.Number(),
  link: Type.Union([Type.String(), Type.Null()]),
  responsible: Type.Union([Type.String(), Type.Null()]),
  details: Type.Union([Type.String(), Type.Null()]),
  title: Type.Union([Type.String(), Type.Null()]),
  titleColor: Type.Union([Type.String(), Type.Null()]),
});

export type BeatLeaderExternalStatusToken = StaticDecode<typeof BeatLeaderExternalStatusSchema>;
