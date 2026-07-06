import { ScoreSaberV2PlayerBadgeToken } from "./player-badge";
import { ScoreSaberV2PlayerStatsToken } from "./player-stats";
import { ScoreSaberV2PlayerPageToken } from "./players-page";
import { ScoreSaberV2ProfileCustomizationToken } from "./profile-customization";

export type ScoreSaberV2PinnedScoreToken = {
  score: {
    score: object;
    leaderboard: object;
  };
  comment: string;
};

export type ScoreSaberV2PlayerToken = {
  id: string;
  name: string;
  playerNameInGame: string;
  country: string;
  role: string | null;
  avatar: string;
  avatarVersion: number;
  permissions: number;
  banned: boolean;
  silenced: boolean;
  inactive: boolean;
  stats: ScoreSaberV2PlayerStatsToken;
  bio: string | null;
  vanity: string | null;
  profileCustomization: ScoreSaberV2ProfileCustomizationToken;
  createdAt: string;
  lastSeenAt: string;
  badges: ScoreSaberV2PlayerBadgeToken[];
  pinnedScores: ScoreSaberV2PinnedScoreToken[];
  followers: number;
  following: number;
};

export type ScoreSaberPlayerLookupToken = ScoreSaberV2PlayerToken | ScoreSaberV2PlayerPageToken;

export function isScoreSaberV2PlayerToken(
  token: ScoreSaberPlayerLookupToken
): token is ScoreSaberV2PlayerToken {
  return "createdAt" in token;
}
