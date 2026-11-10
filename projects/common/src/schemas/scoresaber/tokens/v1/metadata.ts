import { Type, type StaticDecode } from "typebox";

export const ScoreSaberMetadataTokenSchema = Type.Object({
  total: Type.Number(),

  page: Type.Number(),

  itemsPerPage: Type.Number(),
});

export type ScoreSaberMetadataToken = StaticDecode<typeof ScoreSaberMetadataTokenSchema>;
