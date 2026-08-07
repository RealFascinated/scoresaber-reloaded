import { Type, type StaticDecode } from "@sinclair/typebox";

export const BeatLeaderMetadataSchema = Type.Object({
  itemsPerPage: Type.Number(),
  page: Type.Number(),
  total: Type.Number(),
});

export type BeatLeaderMetadataToken = StaticDecode<typeof BeatLeaderMetadataSchema>;
