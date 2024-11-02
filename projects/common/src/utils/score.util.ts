import { Leaderboards } from "../leaderboard";
import { kyFetchJson } from "./utils";
import PlayerScoresResponse from "../response/player-scores-response";
import { Config } from "../config";
import { ScoreSort } from "../score/score-sort";
import LeaderboardScoresResponse from "../response/leaderboard-scores-response";
import { Page } from "../pagination";
import { PlayerScore } from "../score/player-score";
import ScoreSaberLeaderboard from "../model/leaderboard/impl/scoresaber-leaderboard";
import Score from "../model/score/score";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";

/**
 * Fetches the player's scores
 *
 * @param playerId the id of the player
 * @param leaderboardId the id of the leaderboard
 * @param page the page
 */
export async function fetchPlayerScoresHistory(playerId: string, leaderboardId: string, page: number) {
  return kyFetchJson<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>(
    `${Config.apiUrl}/scores/history/${playerId}/${leaderboardId}/${page}`
  );
}

/**
 * Fetches the player's scores
 *
 * @param leaderboard the leaderboard
 * @param id the player id
 * @param page the page
 * @param sort the sort
 * @param search the search
 */
export async function fetchPlayerScores<S, L>(
  leaderboard: Leaderboards,
  id: string,
  page: number,
  sort: ScoreSort,
  search?: string
) {
  return kyFetchJson<PlayerScoresResponse<S, L>>(
    `${Config.apiUrl}/scores/player/${leaderboard}/${id}/${page}/${sort}${search ? `?search=${search}` : ""}`
  );
}

/**
 * Fetches the player's scores
 *
 * @param leaderboard the leaderboard
 * @param id the player id
 * @param page the page
 */
export async function fetchLeaderboardScores<S, L>(leaderboard: Leaderboards, id: string, page: number) {
  return kyFetchJson<LeaderboardScoresResponse<S, L>>(
    `${Config.apiUrl}/scores/leaderboard/${leaderboard}/${id}/${page}`
  );
}

/**
 * Formats the accuracy for a score.
 *
 * @param score the score to format
 * @returns the formatted accuracy
 */
export function formatScoreAccuracy(score: Score) {
  return (score.accuracy == null || score.accuracy == Infinity ? "-" : score.accuracy.toFixed(2)) + "%";
}
