import Leaderboard from "../leaderboard";
import { ScoreSort } from "../sort";
import ScoreSaberPlayer from "../types/scoresaber/scoresaber-player";
import ScoreSaberPlayerScoresPage from "../types/scoresaber/scoresaber-player-scores-page";
import { ScoreSaberPlayerSearch } from "../types/scoresaber/scoresaber-player-search";

const API_BASE = "https://scoresaber.com/api";
const SEARCH_PLAYERS_ENDPOINT = `${API_BASE}/players?search=:query`;
const LOOKUP_PLAYER_ENDPOINT = `${API_BASE}/player/:id/full`;
const LOOKUP_PLAYER_SCORES_ENDPOINT = `${API_BASE}/player/:id/scores?limit=:limit&sort=:sort&page=:page`;

class ScoreSaberLeaderboard extends Leaderboard {
  constructor() {
    super("ScoreSaber");
  }

  /**
   * Gets the players that match the query.
   *
   * @param query the query to search for
   * @param useProxy whether to use the proxy or not
   * @returns the players that match the query, or undefined if no players were found
   */
  async searchPlayers(query: string, useProxy = true): Promise<ScoreSaberPlayerSearch | undefined> {
    this.log(`Searching for players matching "${query}"...`);
    const results = await this.fetch<ScoreSaberPlayerSearch>(
      useProxy,
      SEARCH_PLAYERS_ENDPOINT.replace(":query", query)
    );
    if (results.players.length === 0) {
      return undefined;
    }
    results.players.sort((a, b) => a.rank - b.rank);
    return results;
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param useProxy whether to use the proxy or not
   * @returns the player that matches the ID, or undefined
   */
  async lookupPlayer(playerId: string, useProxy = true): Promise<ScoreSaberPlayer | undefined> {
    this.log(`Looking up player "${playerId}"...`);
    return await this.fetch<ScoreSaberPlayer>(useProxy, LOOKUP_PLAYER_ENDPOINT.replace(":id", playerId));
  }

  /**
   * Looks up a page of scores for a player
   *
   * @param playerId the ID of the player to look up
   * @param sort the sort to use
   * @param page the page to get scores for
   * @param useProxy whether to use the proxy or not
   * @returns the scores of the player, or undefined
   */
  async lookupPlayerScores(
    playerId: string,
    sort: ScoreSort,
    page: number,
    useProxy = true
  ): Promise<ScoreSaberPlayerScoresPage | undefined> {
    this.log(`Looking up scores for player "${playerId}", sort "${sort}", page "${page}"...`);
    return await this.fetch<ScoreSaberPlayerScoresPage>(
      useProxy,
      LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":id", playerId)
        .replace(":limit", 8 + "")
        .replace(":sort", sort)
        .replace(":page", page.toString())
    );
  }
}

export const scoresaberLeaderboard = new ScoreSaberLeaderboard();
