import { Config } from "../config";
import { LeaderboardResponse } from "../response/leaderboard-response";
import { kyFetch } from "./utils";
import { Leaderboards } from "../leaderboard";

/**
 * Fetches the leaderboard
 *
 * @param id the leaderboard id
 * @param leaderboard the leaderboard
 */
export async function fetchLeaderboard<L>(leaderboard: Leaderboards, id: string) {
  return kyFetch<LeaderboardResponse<L>>(`${Config.apiUrl}/leaderboard/${leaderboard}/${id}`);
}
