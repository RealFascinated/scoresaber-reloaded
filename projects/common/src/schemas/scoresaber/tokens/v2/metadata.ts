import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberV2MetadataTokenSchema = Type.Object({
  page: Type.Number(),
  itemsPerPage: Type.Number(),
  totalItems: Type.Number(),
  totalPages: Type.Number(),
});

export type ScoreSaberV2MetadataToken = StaticDecode<typeof ScoreSaberV2MetadataTokenSchema>;
