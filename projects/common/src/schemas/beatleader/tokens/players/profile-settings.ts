import { Type, type StaticDecode } from "@sinclair/typebox";

export const BeatLeaderProfileSettingsSchema = Type.Object({
  id: Type.Optional(Type.Number()),
  bio: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  message: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  effectName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  profileAppearance: Type.Union([Type.String(), Type.Null()]),
  hue: Type.Union([Type.Number(), Type.Null()]),
  saturation: Type.Union([Type.Number(), Type.Null()]),
  leftSaberColor: Type.Union([Type.String(), Type.Null()]),
  rightSaberColor: Type.Union([Type.String(), Type.Null()]),
  profileCover: Type.Union([Type.String(), Type.Null()]),
  starredFriends: Type.Union([Type.String(), Type.Null()]),
  horizontalRichBio: Type.Boolean(),
  rankedMapperSort: Type.Union([Type.String(), Type.Null()]),
  showBots: Type.Boolean(),
  showAllRatings: Type.Boolean(),
  showExplicitCovers: Type.Optional(Type.Boolean()),
  showStatsPublic: Type.Optional(Type.Boolean()),
  showStatsPublicPinned: Type.Optional(Type.Boolean()),
  richPresenceEnabled: Type.Optional(Type.Boolean()),
  streamingViewPermissions: Type.Optional(Type.Number()),
  streamingCommentPermissions: Type.Optional(Type.Number()),
});

export type BeatLeaderProfileSettingsToken = StaticDecode<typeof BeatLeaderProfileSettingsSchema>;
