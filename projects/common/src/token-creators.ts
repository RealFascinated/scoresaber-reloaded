import { env } from "./env";
import type { HMD } from "./hmds";
import { getS3BucketName, StorageBucket } from "./minio-buckets";
import { MapCharacteristic } from "./schemas/map/map-characteristic";
import { ScoreSaberLeaderboardDifficulty } from "./schemas/scoresaber/leaderboard/difficulty";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardSchema,
} from "./schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberLeaderboardStatus } from "./schemas/scoresaber/leaderboard/status";
import { ScoreSaberScore, ScoreSaberScoreSchema } from "./schemas/scoresaber/score/score";
import { Modifier } from "./score/modifier";
import ScoreSaberLeaderboardToken from "./types/token/scoresaber/leaderboard";
import ScoreSaberScoreToken from "./types/token/scoresaber/score";
import { getDifficultyFromScoreSaberDifficulty, ScoreSaberHMDs } from "./utils/scoresaber.util";
import { parseDate } from "./utils/time-utils";

/**
 * Parses a {@link ScoreSaberLeaderboardToken} into a {@link ScoreSaberLeaderboard}.
 *
 * @param token the token to parse
 */
export function getScoreSaberLeaderboardFromToken(token: ScoreSaberLeaderboardToken): ScoreSaberLeaderboard {
  const characteristic = token.difficulty.gameMode.replace("Solo", "");
  const difficulty: ScoreSaberLeaderboardDifficulty = {
    id: token.difficulty.leaderboardId,
    difficulty: getDifficultyFromScoreSaberDifficulty(token.difficulty.difficulty),
    characteristic:
      characteristic == "" || characteristic == undefined
        ? "Standard"
        : (characteristic as MapCharacteristic),
  };
  const difficulties: ScoreSaberLeaderboardDifficulty[] =
    token.difficulties != null
      ? token.difficulties.map(difficulty => {
        const characteristic = difficulty.gameMode.replace("Solo", "");
        return {
          id: difficulty.leaderboardId,
          difficulty: getDifficultyFromScoreSaberDifficulty(difficulty.difficulty),
          characteristic:
            characteristic == "" || characteristic == undefined
              ? "Standard"
              : (characteristic as MapCharacteristic),
        };
      })
      : [difficulty];

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
      songArt: `${env.NEXT_PUBLIC_CDN_URL}/${getS3BucketName(StorageBucket.LeaderboardSongArt)}/${token.songHash}.png`,
      difficulty: difficulty,
      difficulties: difficulties,
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
      accuracy: leaderboard.maxScore
        ? (token.baseScore / leaderboard.maxScore) * 100
        : -1,
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
