import type { ScoreSaberV2PlayerToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import type { ScoreSaberAccountRow, ScoreSaberLeaderboardRow, ScoreSaberScoreRow } from "../../src/db/schema";
import {
  TEST_AVATAR,
  TEST_LEADERBOARD_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_NAME,
  TEST_SCORE_ID,
  TEST_SONG_HASH,
} from "./constants";

const now = new Date("2024-06-01T12:00:00.000Z");

export function buildScoreRow(overrides: Partial<ScoreSaberScoreRow> = {}): ScoreSaberScoreRow {
  return {
    scoreId: TEST_SCORE_ID,
    playerId: TEST_PLAYER_ID,
    leaderboardId: TEST_LEADERBOARD_ID,
    difficulty: "ExpertPlus",
    characteristic: "Standard",
    score: 950,
    accuracy: 0.95,
    pp: 250,
    medals: 1,
    missedNotes: 0,
    badCuts: 1,
    maxCombo: 500,
    fullCombo: false,
    modifiers: [],
    hmd: "Unknown",
    rightController: null,
    leftController: null,
    timestamp: now,
    ...overrides,
  };
}

export function buildLeaderboardRow(
  overrides: Partial<ScoreSaberLeaderboardRow> = {}
): ScoreSaberLeaderboardRow {
  return {
    id: TEST_LEADERBOARD_ID,
    songHash: TEST_SONG_HASH,
    songName: "Test Song",
    songSubName: "Test Sub",
    songAuthorName: "Test Author",
    levelAuthorName: "Test Mapper",
    difficulty: "ExpertPlus",
    characteristic: "Standard",
    maxScore: 1000,
    ranked: true,
    qualified: false,
    stars: 8.5,
    rankedDate: now,
    qualifiedDate: null,
    plays: 100,
    dailyPlays: 10,
    seededScores: true,
    trendingScore: 1,
    timestamp: now,
    ...overrides,
  };
}

export function buildScoreSaberV2PlayerToken(
  overrides: Partial<ScoreSaberV2PlayerToken> = {}
): ScoreSaberV2PlayerToken {
  return {
    id: TEST_PLAYER_ID,
    name: TEST_PLAYER_NAME,
    playerNameInGame: TEST_PLAYER_NAME,
    country: "US",
    role: null,
    avatar: TEST_AVATAR,
    avatarVersion: 1,
    permissions: 0,
    banned: false,
    silenced: false,
    inactive: false,
    stats: {
      realmId: 1,
      realmName: "Steam",
      rank: 100,
      countryRank: 10,
      rankChange: null,
      totalPP: 100,
      plusOnePP: 1,
      totalScore: "1000",
      totalRankedScore: "1000",
      totalPlayedLeaderboards: 1,
      totalPlayedRankedLeaderboards: 1,
      totalSubmittedPlays: 1,
      totalReplayViews: 0,
      averageAccuracy: 0.95,
      weightedAverageAccuracy: 0.95,
      completionAccuracy: 0.95,
      device: null,
    },
    bio: null,
    vanity: null,
    profileCustomization: {
      backgroundImage: null,
      backgroundImageVersion: null,
      accentColor: null,
      accentForegroundColor: null,
      accentForegroundActiveColor: null,
      supporterNameColorEnabled: false,
      badgeOrder: null,
      badgeComments: null,
      statOrder: null,
      enabledStatIds: null,
      chartMetricIds: null,
      sectionOrder: null,
    },
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    badges: [],
    pinnedScores: [],
    followers: 0,
    following: 0,
    ...overrides,
  };
}

export function buildAccountRow(overrides: Partial<ScoreSaberAccountRow> = {}): ScoreSaberAccountRow {
  return {
    id: TEST_PLAYER_ID,
    name: TEST_PLAYER_NAME,
    country: "US",
    avatar: TEST_AVATAR,
    peakRank: null,
    peakRankTimestamp: null,
    seededScores: true,
    seededBeatLeaderScores: true,
    trackReplays: false,
    inactive: false,
    banned: false,
    hmd: "Unknown",
    pp: 100,
    medals: 5,
    medalsRank: 0,
    medalsCountryRank: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
    trackedSince: now,
    joinedDate: now,
    ...overrides,
  };
}
