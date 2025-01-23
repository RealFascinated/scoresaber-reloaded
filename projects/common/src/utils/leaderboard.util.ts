import {Config} from "../config";
import {LeaderboardResponse} from "../response/leaderboard-response";
import {kyFetchText} from "./utils";
import {Leaderboards} from "../leaderboard";
import SuperJSON from "superjson";

/**
 * Fetches the leaderboard
 *
 * @param id the leaderboard id
 * @param leaderboard the leaderboard
 */
export async function fetchLeaderboard<L>(leaderboard: Leaderboards, id: string) {
  const response = await kyFetchText(`${Config.apiUrl}/leaderboard/${leaderboard}/${id}`);
  if (response === undefined) {
    return undefined;
  }
  return SuperJSON.parse<LeaderboardResponse<L>>(response);
}
