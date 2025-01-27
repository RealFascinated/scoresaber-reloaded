import { Config } from "../config";
import { LeaderboardResponse } from "../response/leaderboard-response";
import { kyFetchText } from "./utils";
import SuperJSON from "superjson";
import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { MapDifficulty } from "../score/map-difficulty";
import { MapCharacteristic } from "../types/map-characteristic";

/**
 * Fetches the leaderboard
 *
 * @param id the leaderboard id
 */
export async function fetchLeaderboard(id: string) {
  const response = await kyFetchText(`${Config.apiUrl}/leaderboard/by-id/${id}`);
  if (response === undefined) {
    return undefined;
  }
  return SuperJSON.parse<LeaderboardResponse<ScoreSaberLeaderboard>>(response);
}

/**
 * Fetches the leaderboard
 *
 * @param hash the leaderboard hash
 * @param difficulty the difficulty to get
 * @param characteristic the characteristic to get
 */
export async function fetchLeaderboardByHash(
  hash: string,
  difficulty?: MapDifficulty,
  characteristic?: MapCharacteristic
) {
  const response = await kyFetchText(`${Config.apiUrl}/leaderboard/by-hash/${hash}/${difficulty}/${characteristic}`);
  if (response === undefined) {
    return undefined;
  }
  return SuperJSON.parse<LeaderboardResponse<ScoreSaberLeaderboard>>(response);
}
