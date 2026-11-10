import { Type, type StaticDecode } from "typebox";
import { env } from "../../../env";

export const ScoreSaberLeaderboardPlayerInfoSchema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  country: Type.Optional(Type.String()),
  role: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  // Required in the decoded type: a missing value is filled by the default, null is mapped in Decode
  avatar: Type.Codec(
    Type.Union([Type.String(), Type.Null()], {
      default: env.NEXT_PUBLIC_WEBSITE_URL + "/assets/unknown.png",
    })
  )
    .Decode(avatar => avatar ?? env.NEXT_PUBLIC_WEBSITE_URL + "/assets/unknown.png")
    .Encode(avatar => avatar),
});

export type ScoreSaberLeaderboardPlayerInfo = StaticDecode<typeof ScoreSaberLeaderboardPlayerInfoSchema>;
