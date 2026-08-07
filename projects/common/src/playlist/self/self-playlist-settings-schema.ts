import { Type, type StaticDecode } from "@sinclair/typebox";

export const SelfPlaylistSortFieldSchema = Type.Union([
  Type.Literal("pp"),
  Type.Literal("date"),
  Type.Literal("acc"),
  Type.Literal("score"),
]);
export const SelfPlaylistSortDirectionSchema = Type.Union([Type.Literal("asc"), Type.Literal("desc")]);

export const selfPlaylistSettingsSchema = Type.Object({
  sort: SelfPlaylistSortFieldSchema,
  sortDirection: SelfPlaylistSortDirectionSchema,
  rankedStatus: Type.Union([Type.Literal("all"), Type.Literal("ranked"), Type.Literal("unranked")]),
  starRange: Type.Object({
    min: Type.Number({ minimum: 0, maximum: 20 }),
    max: Type.Number({ minimum: 0, maximum: 20 }),
  }),
  accuracyRange: Type.Object({
    min: Type.Number({ minimum: 0, maximum: 100 }),
    max: Type.Number({ minimum: 0, maximum: 100 }),
  }),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
});

export type SelfPlaylistSettings = StaticDecode<typeof selfPlaylistSettingsSchema>;
