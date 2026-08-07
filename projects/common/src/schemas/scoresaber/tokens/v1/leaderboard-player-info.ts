import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberLeaderboardPlayerInfoTokenSchema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  profilePicture: Type.String(),
  country: Type.Optional(Type.String()),
  permissions: Type.Optional(Type.Number()),
  badges: Type.String(),
  role: Type.Optional(Type.String()),
});

export type ScoreSaberLeaderboardPlayerInfoToken = StaticDecode<
  typeof ScoreSaberLeaderboardPlayerInfoTokenSchema
>;
