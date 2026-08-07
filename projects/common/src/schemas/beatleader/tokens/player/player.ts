import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderAchievementSchema } from "../players/achievement";
import { BeatLeaderBadgeSchema } from "../players/badge";
import { BeatLeaderEarthDayMapSchema } from "../players/earth-day-map";
import { BeatLeaderEventPlayerSchema } from "../players/event-player";
import { BeatLeaderIdolCanvasSchema } from "../players/idol-canvas";
import { BeatLeaderPatreonFeaturesSchema } from "../players/patreon-features";
import { BeatLeaderPlayerBonusIdolSchema } from "../players/player-bonus-idol";
import { BeatLeaderPlayerChangeSchema } from "../players/player-change";
import { BeatLeaderPlayerIdolDecorationSchema } from "../players/player-idol-decoration";
import { BeatLeaderPlayerSocialSchema } from "../players/player-social";
import { BeatLeaderProfileSettingsSchema } from "../players/profile-settings";
import { BeatLeaderRichPresenceSchema } from "../players/rich-presence";
import { BeatLeaderPlayerScoreStatsSchema } from "../players/score-stats";
import { BeatLeaderMapperSchema } from "../score/mapper";

/**
 * Raw `Player` token mirroring the upstream `Player` schema. The BeatLeader
 * websocket score payload embeds a full player object, so every upstream field is
 * modelled.
 */
export const BeatLeaderPlayerSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  platform: Type.String(),
  country: Type.String(),
  avatar: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  pp: Type.Number(),
  rank: Type.Number(),
  countryRank: Type.Number(),
  webAvatar: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  alias: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  oldAlias: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  role: Type.Optional(Type.String()),
  mapperId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  mapper: Type.Optional(Type.Union([BeatLeaderMapperSchema, Type.Null()])),
  accPp: Type.Optional(Type.Number()),
  techPp: Type.Optional(Type.Number()),
  passPp: Type.Optional(Type.Number()),
  allContextsPp: Type.Optional(Type.Number()),
  level: Type.Optional(Type.Number()),
  experience: Type.Optional(Type.Number()),
  prestige: Type.Optional(Type.Number()),
  lastWeekPp: Type.Optional(Type.Number()),
  lastWeekRank: Type.Optional(Type.Number()),
  lastWeekCountryRank: Type.Optional(Type.Number()),
  banned: Type.Optional(Type.Boolean()),
  bot: Type.Optional(Type.Boolean()),
  temporary: Type.Optional(Type.Boolean()),
  inactive: Type.Optional(Type.Boolean()),
  externalProfileUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  richBioTimeset: Type.Optional(Type.Number()),
  createdAt: Type.Optional(Type.Number()),
  speedrunStart: Type.Optional(Type.Number()),
  scoreStatsId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  scoreStats: Type.Optional(Type.Union([BeatLeaderPlayerScoreStatsSchema, Type.Null()])),
  clanOrder: Type.Optional(Type.String()),
  badges: Type.Optional(Type.Union([Type.Array(BeatLeaderBadgeSchema), Type.Null()])),
  patreonFeatures: Type.Optional(Type.Union([BeatLeaderPatreonFeaturesSchema, Type.Null()])),
  profileSettings: Type.Optional(Type.Union([BeatLeaderProfileSettingsSchema, Type.Null()])),
  changes: Type.Optional(Type.Union([Type.Array(BeatLeaderPlayerChangeSchema), Type.Null()])),
  eventsParticipating: Type.Optional(Type.Union([Type.Array(BeatLeaderEventPlayerSchema), Type.Null()])),
  socials: Type.Optional(Type.Union([Type.Array(BeatLeaderPlayerSocialSchema), Type.Null()])),
  achievements: Type.Optional(Type.Union([Type.Array(BeatLeaderAchievementSchema), Type.Null()])),
  earthDayMap: Type.Optional(Type.Union([BeatLeaderEarthDayMapSchema, Type.Null()])),
  idolCanvas: Type.Optional(Type.Union([BeatLeaderIdolCanvasSchema, Type.Null()])),
  richPresence: Type.Optional(Type.Union([BeatLeaderRichPresenceSchema, Type.Null()])),
  playerIdolDecorations: Type.Optional(Type.Array(BeatLeaderPlayerIdolDecorationSchema)),
  playerBonusIdols: Type.Optional(Type.Array(BeatLeaderPlayerBonusIdolSchema)),
});

export type BeatLeaderPlayerToken = StaticDecode<typeof BeatLeaderPlayerSchema>;
