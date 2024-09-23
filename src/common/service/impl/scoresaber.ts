import Service from "../service";
import { ScoreSort } from "../score-sort";
import ScoreSaberLeaderboardScoresPageToken from "@/common/model/token/scoresaber/score-saber-leaderboard-scores-page-token";
import ScoreSaberPlayerToken from "@/common/model/token/scoresaber/score-saber-player-token";
import ScoreSaberPlayerScoresPageToken from "@/common/model/token/scoresaber/score-saber-player-scores-page-token";
import { ScoreSaberPlayerSearchToken } from "@/common/model/token/scoresaber/score-saber-player-search-token";

const API_BASE = "https://scoresaber.com/api";
const SEARCH_PLAYERS_ENDPOINT = `${API_BASE}/players?search=:query`;
const LOOKUP_PLAYER_ENDPOINT = `${API_BASE}/player/:id/full`;
const LOOKUP_PLAYER_SCORES_ENDPOINT = `${API_BASE}/player/:id/scores?limit=:limit&sort=:sort&page=:page`;
const LOOKUP_LEADERBOARD_SCORES_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/scores?page=:page`;

class ScoreSaberService extends Service {
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
  async searchPlayers(
    query: string,
    useProxy = true,
  ): Promise<ScoreSaberPlayerSearchToken | undefined> {
    const before = performance.now();
    this.log(`Searching for players matching "${query}"...`);
    const results = await this.fetch<ScoreSaberPlayerSearchToken>(
      useProxy,
      SEARCH_PLAYERS_ENDPOINT.replace(":query", query),
    );
    if (results === undefined) {
      return undefined;
    }
    if (results.players.length === 0) {
      return undefined;
    }
    results.players.sort((a, b) => a.rank - b.rank);
    this.log(
      `Found ${results.players.length} players in ${(performance.now() - before).toFixed(0)}ms`,
    );
    return results;
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param useProxy whether to use the proxy or not
   * @returns the player that matches the ID, or undefined
   */
  async lookupPlayer(
    playerId: string,
    useProxy = true,
  ): Promise<ScoreSaberPlayerToken | undefined> {
    const before = performance.now();
    this.log(`Looking up player "${playerId}"...`);
    const response = await this.fetch<ScoreSaberPlayerToken>(
      useProxy,
      LOOKUP_PLAYER_ENDPOINT.replace(":id", playerId),
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found player "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`,
    );
    return response;
  }

  /**
   * Looks up a page of scores for a player
   *
   * @param playerId the ID of the player to look up
   * @param sort the sort to use
   * @param page the page to get scores for
   * @param search
   * @param useProxy whether to use the proxy or not
   * @returns the scores of the player, or undefined
   */
  async lookupPlayerScores({
    playerId,
    sort,
    page,
    search,
    useProxy = true,
  }: {
    playerId: string;
    sort: ScoreSort;
    page: number;
    search?: string;
    useProxy?: boolean;
  }): Promise<ScoreSaberPlayerScoresPageToken | undefined> {
    const before = performance.now();
    this.log(
      `Looking up scores for player "${playerId}", sort "${sort}", page "${page}"${search ? `, search "${search}"` : ""}...`,
    );
    const response = await this.fetch<ScoreSaberPlayerScoresPageToken>(
      useProxy,
      LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":id", playerId)
        .replace(":limit", 8 + "")
        .replace(":sort", sort)
        .replace(":page", page + "") + (search ? `&search=${search}` : ""),
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.playerScores.length} scores for player "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`,
    );
    return response;
  }

  /**
   * Looks up a page of scores for a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   * @param sort the sort to use
   * @param page the page to get scores for
   * @param useProxy whether to use the proxy or not
   * @returns the scores of the leaderboard, or undefined
   */
  async lookupLeaderboardScores(
    leaderboardId: string,
    page: number,
    useProxy = true,
  ): Promise<ScoreSaberLeaderboardScoresPageToken | undefined> {
    const before = performance.now();
    this.log(
      `Looking up scores for leaderboard "${leaderboardId}", page "${page}"...`,
    );
    const response = await this.fetch<ScoreSaberLeaderboardScoresPageToken>(
      useProxy,
      LOOKUP_LEADERBOARD_SCORES_ENDPOINT.replace(":id", leaderboardId).replace(
        ":page",
        page.toString(),
      ),
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.scores.length} scores for leaderboard "${leaderboardId}" in ${(performance.now() - before).toFixed(0)}ms`,
    );
    return response;
  }
}

export const scoresaberService = new ScoreSaberService();