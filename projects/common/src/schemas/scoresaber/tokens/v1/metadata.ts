import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberMetadataTokenSchema = Type.Object({
  /**
   * The total amount of returned results.
   */
  total: Type.Number(),

  /**
   * The current page
   */
  page: Type.Number(),

  /**
   * The amount of results per page
   */
  itemsPerPage: Type.Number(),
});

export type ScoreSaberMetadataToken = StaticDecode<typeof ScoreSaberMetadataTokenSchema>;
