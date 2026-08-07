import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverAccountTokenSchema } from "./account";
import { BeatSaverMapMetadataTokenSchema } from "./map-metadata";
import { BeatSaverMapStatsTokenSchema } from "./map-stats";
import { BeatSaverMapVersionTokenSchema } from "./map-version";

/** BeatSaver API `MapDetail.declaredAi` (Swagger). */
export const BeatSaverMapDeclaredAiSchema = Type.Union([
  Type.Literal("Admin"),
  Type.Literal("Uploader"),
  Type.Literal("SageScore"),
  Type.Literal("None"),
]);

export type BeatSaverMapDeclaredAi = StaticDecode<typeof BeatSaverMapDeclaredAiSchema>;

/** Shapes `MapDetail` from BeatSaver Swagger where we already consume maps in-app. */
export const BeatSaverMapTokenSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  uploader: BeatSaverAccountTokenSchema,
  metadata: BeatSaverMapMetadataTokenSchema,
  stats: BeatSaverMapStatsTokenSchema,
  uploaded: Type.Optional(Type.String()),
  automapper: Type.Boolean(),
  ranked: Type.Boolean(),
  qualified: Type.Boolean(),
  versions: Type.Array(BeatSaverMapVersionTokenSchema),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  lastPublishedAt: Type.Optional(Type.String()),
  tags: Type.Array(Type.String()),
  declaredAi: BeatSaverMapDeclaredAiSchema,
  blRanked: Type.Boolean(),
  blQualified: Type.Boolean(),

  bookmarked: Type.Optional(Type.Boolean()),
  collaborators: Type.Optional(Type.Array(BeatSaverAccountTokenSchema)),
  curator: Type.Optional(BeatSaverAccountTokenSchema),
  curatedAt: Type.Optional(Type.String()),
  deletedAt: Type.Optional(Type.String()),
  nsfw: Type.Optional(Type.Boolean()),
});

export type BeatSaverMapToken = StaticDecode<typeof BeatSaverMapTokenSchema>;
