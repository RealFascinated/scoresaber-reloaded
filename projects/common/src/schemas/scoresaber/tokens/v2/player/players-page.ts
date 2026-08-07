import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberV2MetadataTokenSchema } from "../metadata";
import { ScoreSaberV2PlayerStatsTokenSchema } from "./player-stats";

export const ScoreSaberV2PlayerPageTokenSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  playerNameInGame: Type.String(),
  country: Type.String(),
  role: Type.Union([Type.String(), Type.Null()]),
  avatar: Type.String(),
  avatarVersion: Type.Number(),
  permissions: Type.Number(),
  banned: Type.Boolean(),
  silenced: Type.Boolean(),
  inactive: Type.Boolean(),
  stats: ScoreSaberV2PlayerStatsTokenSchema,
});

export type ScoreSaberV2PlayerPageToken = StaticDecode<typeof ScoreSaberV2PlayerPageTokenSchema>;

export const ScoreSaberV2PlayersPageTokenSchema = Type.Object({
  data: Type.Array(ScoreSaberV2PlayerPageTokenSchema),
  metadata: ScoreSaberV2MetadataTokenSchema,
});

export type ScoreSaberV2PlayersPageToken = StaticDecode<typeof ScoreSaberV2PlayersPageTokenSchema>;
