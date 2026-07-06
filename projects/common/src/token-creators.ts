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
import ScoreSaberScoreToken from "./types/token/scoresaber/v1/score";
import { ScoreSaberV2LeaderboardPageToken } from "./types/token/scoresaber/v2/leaderboard/leaderboards-page";
import { getDifficultyFromScoreSaberDifficulty, ScoreSaberHMDs } from "./utils/scoresaber.util";
import { parseDate } from "./utils/time-utils";

/**
 * Parses a {@link ScoreSaberV2LeaderboardPageToken} into a {@link ScoreSaberLeaderboard}.
 *
 * @param token the v2 token to parse
 */
export function getScoreSaberLeaderboardFromV2PageToken(
  token: ScoreSaberV2LeaderboardPageToken
): ScoreSaberLeaderboard {
  const characteristic = token.difficulty.gameMode.replace("Solo", "");
  const difficulty: ScoreSaberLeaderboardDifficulty = {
    id: token.difficulty.id,
    stars: token.realm.stars,
    difficulty: getDifficultyFromScoreSaberDifficulty(token.difficulty.difficulty),
    characteristic:
      characteristic == "" || characteristic == undefined
        ? "Standard"
        : (characteristic as MapCharacteristic),
  };

  let status: ScoreSaberLeaderboardStatus = "Unranked";
  if (token.realm.leaderboardStatus === "QUALIFIED") {
    status = "Qualified";
  } else if (token.realm.leaderboardStatus === "RANKED") {
    status = "Ranked";
  }

  return ScoreSaberLeaderboardSchema.parse(
    {
      id: token.id,
      songHash: token.map.hash.toUpperCase(),
      songName: token.map.songName,
      songSubName: token.map.songSubName,
      fullName: `${token.map.songName} ${token.map.songSubName}`.trim(),
      songAuthorName: token.map.songAuthorName,
      levelAuthorName: token.map.levelAuthorName,
      songArt: token.map.coverUrl,
      difficulty: difficulty,
      difficulties: [],
      maxScore: token.maxScore,
      ranked: token.realm.leaderboardStatus === "RANKED",
      timestamp: parseDate(token.createdAt),
      stars: token.realm.stars,
      plays: token.totalScores,
      dailyPlays: token.dailyScores,
      qualified: token.realm.leaderboardStatus === "QUALIFIED",
      status: status,
      rankedDate: token.realm.rankedAt ? parseDate(token.realm.rankedAt) : undefined,
      qualifiedDate: token.realm.qualifiedAt ? parseDate(token.realm.qualifiedAt) : undefined,
    },
    { reportInput: true }
  );
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
