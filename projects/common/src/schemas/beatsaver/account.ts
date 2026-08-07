import { Type } from "@sinclair/typebox";

export const BeatSaverAccountSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  hash: Type.String(),
  avatar: Type.String(),
  type: Type.String(),
  admin: Type.Boolean(),
  curator: Type.Boolean(),
  seniorCurator: Type.Boolean(),
  verifiedMapper: Type.Boolean(),
  playlistUrl: Type.String(),
});
