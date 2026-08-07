import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `PlayerSocial` token mirroring the upstream `PlayerSocial` schema.
 */
export const BeatLeaderPlayerSocialSchema = Type.Object({
  id: Type.Number(),
  service: Type.String(),
  link: Type.String(),
  user: Type.String(),
  userId: Type.String(),
  playerId: Type.Union([Type.String(), Type.Null()]),
  hidden: Type.Boolean(),
});

export type BeatLeaderPlayerSocialToken = StaticDecode<typeof BeatLeaderPlayerSocialSchema>;
