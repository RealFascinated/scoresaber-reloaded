import Leaderboard from "../leaderboard";
import LeaderboardDifficulty from "../leaderboard-difficulty";
import ScoreSaberLeaderboardToken from "../../types/token/scoresaber/score-saber-leaderboard-token";
import { getDifficultyFromScoreSaberDifficulty } from "../../utils/scoresaber-utils";
import { parseDate } from "../../utils/time-utils";
import { LeaderboardStatus } from "../leaderboard-status";

export default interface ScoreSaberLeaderboard extends Leaderboard {
  /**
   * The star count for the leaderboard.
   */
  readonly stars: number;

  /**
   * The total amount of plays.
   */
  readonly plays: number;

  /**
   * The amount of plays today.
   */
  readonly dailyPlays: number;

  /**
   * Whether this leaderboard is qualified to be ranked.
   */
  readonly qualified: boolean;

  /**
   * The status of the map.
   */
  readonly status: LeaderboardStatus;
}

/**
 * Parses a {@link ScoreSaberLeaderboardToken} into a {@link ScoreSaberLeaderboard}.
 *
 * @param token the token to parse
 */
export function getScoreSaberLeaderboardFromToken(token: ScoreSaberLeaderboardToken): ScoreSaberLeaderboard {
  const difficulty: LeaderboardDifficulty = {
    leaderboardId: token.difficulty.leaderboardId,
    difficulty: getDifficultyFromScoreSaberDifficulty(token.difficulty.difficulty),
    gameMode: token.difficulty.gameMode.replace("Solo", ""),
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
    songHash: token.songHash,
    songName: token.songName,
    songSubName: token.songSubName,
    songAuthorName: token.songAuthorName,
    levelAuthorName: token.levelAuthorName,
    difficulty: difficulty,
    difficulties:
      token.difficulties != undefined && token.difficulties.length > 0
        ? token.difficulties.map(difficulty => {
            return {
              leaderboardId: difficulty.leaderboardId,
              difficulty: getDifficultyFromScoreSaberDifficulty(difficulty.difficulty),
              gameMode: difficulty.gameMode.replace("Solo", ""),
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
  };
}
