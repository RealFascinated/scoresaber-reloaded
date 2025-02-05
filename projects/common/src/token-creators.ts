import ScoreSaberLeaderboard from "./model/leaderboard/impl/scoresaber-leaderboard";
import ScoreSaberLeaderboardToken from "./types/token/scoresaber/leaderboard";
import LeaderboardDifficulty from "./model/leaderboard/leaderboard-difficulty";
import { MapCharacteristic } from "./types/map-characteristic";
import { LeaderboardStatus } from "./model/leaderboard/leaderboard-status";
import { parseDate } from "./utils/time-utils";
import ScoreSaberScoreToken from "./types/token/scoresaber/score";
import { ScoreSaberScore } from "./model/score/impl/scoresaber-score";
import { Modifier } from "./score/modifier";
import { getDifficultyFromScoreSaberDifficulty, ScoreSaberHMDs } from "./utils/scoresaber.util";
import { Controllers } from "./model/score/controllers";

/**
 * Parses a {@link ScoreSaberLeaderboardToken} into a {@link ScoreSaberLeaderboard}.
 *
 * @param token the token to parse
 */
export function getScoreSaberLeaderboardFromToken(
  token: ScoreSaberLeaderboardToken
): ScoreSaberLeaderboard {
  const difficulty: LeaderboardDifficulty = {
    leaderboardId: token.difficulty.leaderboardId,
    difficulty: getDifficultyFromScoreSaberDifficulty(token.difficulty.difficulty),
    characteristic: token.difficulty.gameMode.replace("Solo", "") as MapCharacteristic,
    difficultyRaw: token.difficulty.difficultyRaw,
  };

  let status: LeaderboardStatus = "Unranked";
  if (token.qualified) {
    status = "Qualified";
  } else if (token.ranked) {
    status = "Ranked";
  }

  return {
    id: token.id,
    songHash: token.songHash.toUpperCase(),
    songName: token.songName,
    songSubName: token.songSubName,
    fullName: `${token.songName} ${token.songSubName}`.trim(),
    songAuthorName: token.songAuthorName,
    levelAuthorName: token.levelAuthorName,
    difficulty: difficulty,
    difficulties:
      token.difficulties != undefined && token.difficulties.length > 0
        ? token.difficulties.map(difficulty => {
            return {
              leaderboardId: difficulty.leaderboardId,
              difficulty: getDifficultyFromScoreSaberDifficulty(difficulty.difficulty),
              characteristic: difficulty.gameMode.replace("Solo", "") as MapCharacteristic,
              difficultyRaw: difficulty.difficultyRaw,
            };
          })
        : [difficulty],
    maxScore: token.maxScore,
    ranked: token.ranked,
    songArt: token.coverImage,
    timestamp: parseDate(token.createdDate),
    stars: token.stars,
    plays: token.plays,
    dailyPlays: token.dailyPlays,
    qualified: token.qualified,
    status: status,
    dateRanked: token.rankedDate ? parseDate(token.rankedDate) : undefined,
    dateQualified: token.qualifiedDate ? parseDate(token.qualifiedDate) : undefined,
  };
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

  const controllers: Controllers | undefined =
    token.deviceControllerRight && token.deviceControllerLeft
      ? {
          rightController: token.deviceControllerRight,
          leftController: token.deviceControllerLeft,
        }
      : undefined;

  return {
    playerId: playerId || token.leaderboardPlayerInfo.id,
    leaderboardId: leaderboard.id,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
    score: token.baseScore,
    accuracy: leaderboard.maxScore ? (token.baseScore / leaderboard.maxScore) * 100 : Infinity,
    rank: token.rank,
    modifiers: modifiers,
    misses: token.missedNotes + token.badCuts,
    missedNotes: token.missedNotes,
    badCuts: token.badCuts,
    fullCombo: token.fullCombo,
    timestamp: new Date(token.timeSet),
    scoreId: token.id,
    pp: token.pp,
    weight: token.weight,
    maxCombo: token.maxCombo,
    playerInfo: token.leaderboardPlayerInfo,
    hmd: token.deviceHmd ?? ScoreSaberHMDs[token.hmd] ?? undefined,
    controllers: controllers,
  };
}
