import { Leaderboards } from "../leaderboard";
import { kyFetch } from "./utils";
import PlayerScoresResponse from "../response/player-scores-response";
import { Config } from "../config";
import { ScoreSort } from "../score/score-sort";
import LeaderboardScoresResponse from "../response/leaderboard-scores-response";
import { ScoreSortType } from "../sorter/sort-type";
import { SortDirection } from "../sorter/sort-direction";

/**
 * Fetches the player's scores
 *
 * @param leaderboard the leaderboard
 * @param id the player id
 * @param page the page
 * @param sort the sort
 * @param direction the direction to sort
 * @param search the search
 */
export async function fetchPlayerScores<S, L>(
  leaderboard: Leaderboards,
  id: string,
  page: number,
  sort: ScoreSortType,
  direction: SortDirection,
  search?: string
) {
  return kyFetch<PlayerScoresResponse<S, L>>(
    `${Config.apiUrl}/scores/player/${leaderboard}/${id}/${page}/${sort}/${direction}${search ? `?search=${search}` : ""}`
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
  return kyFetch<LeaderboardScoresResponse<S, L>>(`${Config.apiUrl}/scores/leaderboard/${leaderboard}/${id}/${page}`);
}
