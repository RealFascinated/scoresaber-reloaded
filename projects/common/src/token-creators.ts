import type { HMD } from "./hmds";
import { MapCharacteristic } from "./schemas/map/map-characteristic";
import { ScoreSaberLeaderboardDifficulty } from "./schemas/scoresaber/leaderboard/difficulty";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardSchema,
} from "./schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberLeaderboardStatus } from "./schemas/scoresaber/leaderboard/status";
import { ScoreSaberScore, ScoreSaberScoreSchema } from "./schemas/scoresaber/score/score";
import { Modifier } from "./score/modifier";
import ScoreSaberLeaderboardToken from "./types/token/scoresaber/v1/leaderboard";
import { ScoreSaberPlayerToken } from "./types/token/scoresaber/v1/player";
import ScoreSaberScoreToken from "./types/token/scoresaber/v1/score";
import { ScoreSaberV2LeaderboardPageToken } from "./types/token/scoresaber/v2/leaderboard/leaderboards-page";
import { ScoreSaberV2PlayerPageToken } from "./types/token/scoresaber/v2/player/players-page";
import { getDifficultyFromScoreSaberDifficulty, ScoreSaberHMDs } from "./utils/scoresaber.util";
import { parseDate } from "./utils/time-utils";

/**
 * Parses a {@link ScoreSaberV2PlayerPageToken} into a {@link ScoreSaberPlayerToken}.
 *
 * @param token the v2 token to parse
 */
export function getScoreSaberPlayerFromV2Token(token: ScoreSaberV2PlayerPageToken): ScoreSaberPlayerToken {
  return {
    id: token.id,
    name: token.name,
    profilePicture: token.avatar,
    bio: null,
    country: token.country,
    pp: token.stats.totalPP,
    rank: token.stats.rank,
    countryRank: token.stats.countryRank,
    role: token.role,
    badges: null,
    histories: "",
    scoreStats: {
      totalScore: Number(token.stats.totalScore),
      totalRankedScore: Number(token.stats.totalRankedScore),
      averageRankedAccuracy: token.stats.averageAccuracy,
      totalPlayCount: token.stats.totalSubmittedPlays,
      rankedPlayCount: token.stats.totalSubmittedPlays,
      replaysWatched: token.stats.totalReplayViews,
    },
    permissions: token.permissions,
    banned: token.banned,
    inactive: token.inactive,
    firstSeen: new Date().toISOString(),
  };
}

/**
 * Parses a {@link ScoreSaberV2LeaderboardPageToken} into a {@link ScoreSaberLeaderboardToken}.
 *
 * @param token the v2 token to parse
 */
export function getScoreSaberLeaderboardFromV2Token(
  token: ScoreSaberV2LeaderboardPageToken
): ScoreSaberLeaderboardToken {
  return {
    id: token.id,
    songHash: token.map.hash,
    songName: token.map.songName,
    songSubName: token.map.songSubName,
    songAuthorName: token.map.songAuthorName,
    levelAuthorName: token.map.levelAuthorName,
    difficulty: {
      leaderboardId: token.difficulty.id,
      difficulty: token.difficulty.difficulty,
      gameMode: token.difficulty.gameMode,
      difficultyRaw: token.difficulty.rawDifficulty,
    },
    maxScore: token.maxScore,
    createdDate: token.createdAt,
    rankedDate: token.realm.rankedAt ?? "",
    qualifiedDate: token.realm.qualifiedAt ?? "",
    lovedDate: token.realm.lovedAt ?? "",
    ranked: token.realm.leaderboardStatus === "RANKED",
    qualified: token.realm.leaderboardStatus === "QUALIFIED",
    loved: token.realm.leaderboardStatus === "LOVED",
    maxPP: 0,
    stars: token.realm.stars,
    positiveModifiers: token.realm.positiveModifiers,
    plays: token.totalScores,
    dailyPlays: token.dailyScores,
    coverImage: token.map.coverUrl,
    difficulties: [],
  };
}

/**
 * Parses a {@link ScoreSaberLeaderboardToken} into a {@link ScoreSaberLeaderboard}.
 *
 * @param token the token to parse
 */
export function getScoreSaberLeaderboardFromToken(token: ScoreSaberLeaderboardToken): ScoreSaberLeaderboard {
  const characteristic = token.difficulty.gameMode.replace("Solo", "");
  const difficulty: ScoreSaberLeaderboardDifficulty = {
    id: token.difficulty.leaderboardId,
    stars: token.stars,
    difficulty: getDifficultyFromScoreSaberDifficulty(token.difficulty.difficulty),
    characteristic:
      characteristic == "" || characteristic == undefined
        ? "Standard"
        : (characteristic as MapCharacteristic),
  };

  let status: ScoreSaberLeaderboardStatus = "Unranked";
  if (token.qualified) {
    status = "Qualified";
  } else if (token.ranked) {
    status = "Ranked";
  }

  return ScoreSaberLeaderboardSchema.parse(
    {
      id: token.id,
      songHash: token.songHash.toUpperCase(),
      songName: token.songName,
      songSubName: token.songSubName,
      fullName: `${token.songName} ${token.songSubName}`.trim(),
      songAuthorName: token.songAuthorName,
      levelAuthorName: token.levelAuthorName,
      songArt: token.coverImage,
      difficulty: difficulty,
      difficulties: [],
      maxScore: token.maxScore,
      ranked: token.ranked,
      timestamp: parseDate(token.createdDate),
      stars: token.stars,
      plays: token.plays,
      dailyPlays: token.dailyPlays,
      qualified: token.qualified,
      status: status,
      rankedDate: token.rankedDate ? parseDate(token.rankedDate) : undefined,
      qualifiedDate: token.qualifiedDate ? parseDate(token.qualifiedDate) : undefined,
    },
    { reportInput: true }
  );
}

/**
 * Gets a {@link ScoreSaberScore} from a {@link ScoreSaberScoreToken}.
 *
 * @param token the token to convert
 * @param playerId the id of the player who set the score
 * @param leaderboard the leaderboard the score was set on
 */
export function getScoreSaberScoreFromToken(
  token: ScoreSaberScoreToken,
  leaderboard: ScoreSaberLeaderboard,
  playerId?: string
): ScoreSaberScore {
  const modifiers: Modifier[] =
    token.modifiers == undefined || token.modifiers === ""
      ? []
      : token.modifiers.split(",").map(mod => {
        mod = mod.toUpperCase();
        const modifier = Modifier[mod as keyof typeof Modifier];
        if (modifier === undefined) {
          throw new Error(`Unknown modifier: ${mod}`);
        }
        return modifier;
      });

  return ScoreSaberScoreSchema.parse(
    {
      playerId: playerId ?? token.leaderboardPlayerInfo.id,
      leaderboardId: leaderboard.id,
      scoreId: token.id,
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic ?? "Standard",
      score: token.baseScore,
      accuracy: leaderboard.maxScore ? (token.baseScore / leaderboard.maxScore) * 100 : -1,
      pp: token.pp,
      weight: token.weight,
      rank: token.rank,
      misses: token.missedNotes + token.badCuts,
      missedNotes: token.missedNotes,
      badCuts: token.badCuts,
      maxCombo: token.maxCombo,
      fullCombo: token.fullCombo,
      modifiers,
      hmd: (token.deviceHmd as HMD) ?? (ScoreSaberHMDs[token.hmd] as HMD | undefined),
      rightController: token.deviceControllerRight,
      leftController: token.deviceControllerLeft,
      ...(token.leaderboardPlayerInfo ? { playerInfo: token.leaderboardPlayerInfo } : {}),
      timestamp: new Date(token.timeSet),
    },
    { reportInput: true }
  );
}
