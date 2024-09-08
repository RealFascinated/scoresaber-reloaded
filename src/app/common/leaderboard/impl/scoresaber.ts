import ky from "ky";
import Leaderboard from "../leaderboard";
import ScoreSaberPlayer from "../types/scoresaber/scoresaber-player";
import { ScoreSaberPlayerSearch } from "../types/scoresaber/scoresaber-player-search";

const API_BASE = "https://scoresaber.com/api";
const SEARCH_PLAYERS_ENDPOINT = `${API_BASE}/players?search={query}`;
const LOOKUP_PLAYER_ENDPOINT = `${API_BASE}/player/{playerId}/full`;

class ScoreSaberLeaderboard extends Leaderboard {
  /**
   * Gets the players that match the query.
   *
   * @param query the query to search for
   * @param useProxy whether to use the proxy or not
   * @returns the players that match the query, or undefined if no players were found
   */
  async searchPlayers(query: string, useProxy = true): Promise<ScoreSaberPlayerSearch | undefined> {
    try {
      const results = await ky
        .get((useProxy ? "https://proxy.fascinated.cc/" : "") + SEARCH_PLAYERS_ENDPOINT.replace("{query}", query))
        .json<ScoreSaberPlayerSearch>();
      if (results.players.length === 0) {
        return undefined;
      }
      results.players.sort((a, b) => a.rank - b.rank);
      return results;
    } catch {
      return undefined;
    }
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param useProxy whether to use the proxy or not
   * @returns the player that matches the ID, or undefined
   */
  async lookupPlayer(playerId: string, useProxy = true): Promise<ScoreSaberPlayer | undefined> {
    try {
      const results = await ky
        .get((useProxy ? "https://proxy.fascinated.cc/" : "") + LOOKUP_PLAYER_ENDPOINT.replace("{playerId}", playerId))
        .json<ScoreSaberPlayer>();
      return results;
    } catch {
      return undefined;
    }
  }
}

export const scoresaberLeaderboard = new ScoreSaberLeaderboard();
