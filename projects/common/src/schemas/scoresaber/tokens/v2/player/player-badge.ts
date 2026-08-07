import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberV2PlayerBadgeTokenSchema = Type.Object({
  id: Type.Number(),
  image: Type.String(),
  description: Type.String(),
});

export type ScoreSaberV2PlayerBadgeToken = StaticDecode<typeof ScoreSaberV2PlayerBadgeTokenSchema>;
