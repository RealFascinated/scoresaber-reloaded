import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderClanSchema } from "./clan";
import { BeatLeaderPatreonFeaturesSchema } from "./patreon-features";
import { BeatLeaderPlayerContextExtensionSchema } from "./player-context-extension";
import { BeatLeaderPlayerSocialSchema } from "./player-social";
import { BeatLeaderProfileSettingsSchema } from "./profile-settings";
import { BeatLeaderRichPresenceSchema } from "./rich-presence";
import { BeatLeaderPlayerScoreStatsSchema } from "./score-stats";

/**
 * Linked platform account IDs for a BeatLeader player. IDs can be returned as
 * strings or numbers depending on the platform, so each is coerced to a string.
 * BeatLeader supports Steam, Oculus PC and Quest accounts only.
 */
export const BeatLeaderLinkedIdsSchema = Type.Object({
  steamId: Type.Optional(Type.Union([Type.Union([Type.String(), Type.Number()]), Type.Null()])),
  oculusPCId: Type.Optional(Type.Union([Type.Union([Type.String(), Type.Number()]), Type.Null()])),
  questId: Type.Optional(Type.Union([Type.Union([Type.String(), Type.Number()]), Type.Null()])),
});

export type BeatLeaderLinkedIdsToken = StaticDecode<typeof BeatLeaderLinkedIdsSchema>;

/**
 * A BeatLeader player as returned by the API. Mirrors the upstream `PlayerResponse`
 * schema (`GET /players` items) with the `PlayerResponseFull` extras the app relies
 * on (`GET /player/{id}`); the extras are optional since the list endpoint omits them.
 * Only the fields the app consumes are required.
 */
export const BeatLeaderPlayerResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  platform: Type.String(),
  avatar: Type.String(),
  country: Type.String(),
  alias: Type.Union([Type.String(), Type.Null()]),
  bot: Type.Boolean(),
  temporary: Type.Optional(Type.Boolean()),
  pp: Type.Number(),
  rank: Type.Number(),
  countryRank: Type.Number(),
  level: Type.Optional(Type.Number()),
  experience: Type.Optional(Type.Number()),
  prestige: Type.Optional(Type.Number()),
  role: Type.String(),
  socials: Type.Optional(Type.Union([Type.Array(BeatLeaderPlayerSocialSchema), Type.Null()])),
  contextExtensions: Type.Optional(
    Type.Union([Type.Array(BeatLeaderPlayerContextExtensionSchema), Type.Null()])
  ),
  patreonFeatures: Type.Optional(Type.Union([BeatLeaderPatreonFeaturesSchema, Type.Null()])),
  profileSettings: BeatLeaderProfileSettingsSchema,
  richPresence: Type.Optional(Type.Union([BeatLeaderRichPresenceSchema, Type.Null()])),
  clanOrder: Type.Optional(Type.String()),
  clans: Type.Optional(Type.Union([Type.Array(BeatLeaderClanSchema), Type.Null()])),
  // PlayerResponseFull extras (`GET /player/{id}`).
  banned: Type.Optional(Type.Boolean()),
  inactive: Type.Optional(Type.Boolean()),
  externalProfileUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  scoreStats: Type.Optional(BeatLeaderPlayerScoreStatsSchema),
  linkedIds: Type.Optional(Type.Union([BeatLeaderLinkedIdsSchema, Type.Null()])),
});

export type BeatLeaderPlayerResponseToken = StaticDecode<typeof BeatLeaderPlayerResponseSchema>;

/**
 * Minimal parser for `GET /player/{id}` responses. The endpoint's response shape is
 * loose (e.g. `role` is a string, `socials` are objects, `clan` is often absent), so
 * only the fields we rely on are validated.
 */
export const BeatLeaderPlayerLookupSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  platform: Type.String(),
  linkedIds: Type.Optional(Type.Union([BeatLeaderLinkedIdsSchema, Type.Null()])),
});

export type BeatLeaderPlayerLookupToken = StaticDecode<typeof BeatLeaderPlayerLookupSchema>;
