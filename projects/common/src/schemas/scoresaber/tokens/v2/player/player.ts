import { Type, type StaticDecode } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { ScoreSaberV2LeaderboardPageTokenSchema } from "../leaderboard/leaderboards-page";
import { ScoreSaberV2PlayerBadgeTokenSchema } from "./player-badge";
import { ScoreSaberV2PlayerStatsTokenSchema } from "./player-stats";
import { ScoreSaberV2PlayerPageToken } from "./players-page";
import { ScoreSaberV2ProfileCustomizationTokenSchema } from "./profile-customization";

const ScoreSaberV2PinnedScorePlayerTokenSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  playerNameInGame: Type.String(),
  country: Type.String(),
  role: Type.Union([Type.String(), Type.Null()]),
  avatar: Type.String(),
  avatarVersion: Type.Number(),
  permissions: Type.Number(),
});

const ScoreSaberV2PinnedScoreDeviceTokenSchema = Type.Object({
  hmd: Type.Union([Type.String(), Type.Null()]),
  controllerLeft: Type.Union([Type.String(), Type.Null()]),
  controllerRight: Type.Union([Type.String(), Type.Null()]),
});

const ScoreSaberV2PinnedScoreScoreTokenSchema = Type.Object({
  id: Type.Number(),
  rank: Type.Number(),
  unmodifiedScore: Type.Number(),
  modifiedScore: Type.Number(),
  accuracy: Type.Number(),
  pp: Type.Number(),
  weight: Type.Number(),
  mods: Type.Array(Type.String()),
  badCuts: Type.Number(),
  missedNotes: Type.Number(),
  maxCombo: Type.Number(),
  fullCombo: Type.Boolean(),
  hasReplay: Type.Boolean(),
  replayViewCount: Type.Optional(Type.Number()),
  personalBest: Type.Boolean(),
  legacyHmdId: Type.Union([Type.Number(), Type.Null()]),
  version: Type.Union([Type.String(), Type.Null()]),
  playOutcome: Type.Union([
    Type.Literal("CLEAR"),
    Type.Literal("FAIL"),
    Type.Literal("QUIT"),
    Type.Literal("RESTART"),
  ]),
  playOutcomeTime: Type.Union([Type.Number(), Type.Null()]),
  createdAt: Type.String(),
  hasHistory: Type.Optional(Type.Boolean()),
  player: ScoreSaberV2PinnedScorePlayerTokenSchema,
  device: Type.Union([ScoreSaberV2PinnedScoreDeviceTokenSchema, Type.Null()]),
});

export const ScoreSaberV2PinnedScoreTokenSchema = Type.Object({
  score: Type.Object({
    score: ScoreSaberV2PinnedScoreScoreTokenSchema,
    leaderboard: ScoreSaberV2LeaderboardPageTokenSchema,
  }),
  comment: Type.String(),
});

export type ScoreSaberV2PinnedScoreToken = StaticDecode<typeof ScoreSaberV2PinnedScoreTokenSchema>;

export const ScoreSaberV2PlayerTokenSchema = Type.Object({
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
  bio: Type.Union([Type.String(), Type.Null()]),
  vanity: Type.Union([Type.String(), Type.Null()]),
  profileCustomization: ScoreSaberV2ProfileCustomizationTokenSchema,
  createdAt: Type.String(),
  lastSeenAt: Type.String(),
  badges: Type.Array(ScoreSaberV2PlayerBadgeTokenSchema),
  pinnedScores: Type.Array(ScoreSaberV2PinnedScoreTokenSchema),
  followers: Type.Number(),
  following: Type.Number(),
});

export type ScoreSaberV2PlayerToken = StaticDecode<typeof ScoreSaberV2PlayerTokenSchema>;

export type ScoreSaberPlayerLookupToken = ScoreSaberV2PlayerToken | ScoreSaberV2PlayerPageToken;

export function isScoreSaberV2PlayerToken(
  token: ScoreSaberPlayerLookupToken
): token is ScoreSaberV2PlayerToken {
  return Value.Check(ScoreSaberV2PlayerTokenSchema, token);
}
