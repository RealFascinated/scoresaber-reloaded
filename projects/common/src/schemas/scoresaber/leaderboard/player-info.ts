import { Type, type StaticDecode } from "@sinclair/typebox";
import { env } from "../../../env";

export const ScoreSaberLeaderboardPlayerInfoSchema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  country: Type.Optional(Type.String()),
  role: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  avatar: Type.Transform(
    Type.Optional(
      Type.Union([Type.String(), Type.Null()], {
        default: env.NEXT_PUBLIC_WEBSITE_URL + "/assets/unknown.png",
      })
    )
  )
    .Decode(avatar => avatar ?? env.NEXT_PUBLIC_WEBSITE_URL + "/assets/unknown.png")
    .Encode(avatar => avatar),
});

export type ScoreSaberLeaderboardPlayerInfo = StaticDecode<typeof ScoreSaberLeaderboardPlayerInfoSchema>;
