import { Leaderboards } from "../leaderboard";
import { kyFetch } from "./utils";
import PlayerScoresResponse from "../response/player-scores-response";
import { Config } from "../config";
import { ScoreSort } from "../score/score-sort";

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
  return kyFetch<PlayerScoresResponse<S, L>>(
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
  return kyFetch<PlayerScoresResponse<S, L>>(`${Config.apiUrl}/scores/leaderboard/${leaderboard}/${id}/${page}`);
}
