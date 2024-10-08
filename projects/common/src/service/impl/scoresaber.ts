import Service from "../service";
import { ScoreSaberPlayerSearchToken } from "../../types/token/scoresaber/score-saber-player-search-token";
import ScoreSaberPlayerToken from "../../types/token/scoresaber/score-saber-player-token";
import ScoreSaberPlayer, { getScoreSaberPlayerFromToken } from "../../types/player/impl/scoresaber-player";
import { ScoreSaberPlayersPageToken } from "../../types/token/scoresaber/score-saber-players-page-token";
import { ScoreSort } from "../../types/score/score-sort";
import ScoreSaberPlayerScoresPageToken from "../../types/token/scoresaber/score-saber-player-scores-page-token";
import ScoreSaberLeaderboardToken from "../../types/token/scoresaber/score-saber-leaderboard-token";
import ScoreSaberLeaderboardScoresPageToken from "../../types/token/scoresaber/score-saber-leaderboard-scores-page-token";

const API_BASE = "https://scoresaber.com/api";

/**
 * Player
 */
const SEARCH_PLAYERS_ENDPOINT = `${API_BASE}/players?search=:query`;
const LOOKUP_PLAYER_ENDPOINT = `${API_BASE}/player/:id/full`;
const LOOKUP_PLAYERS_ENDPOINT = `${API_BASE}/players?page=:page`;
const LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT = `${API_BASE}/players?page=:page&countries=:country`;
const LOOKUP_PLAYER_SCORES_ENDPOINT = `${API_BASE}/player/:id/scores?limit=:limit&sort=:sort&page=:page`;

/**
 * Leaderboard
 */
const LOOKUP_LEADERBOARD_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/info`;
const LOOKUP_LEADERBOARD_SCORES_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/scores?page=:page`;

class ScoreSaberService extends Service {
  constructor() {
    super("ScoreSaber");
  }

  /**
   * Gets the players that match the query.
   *
   * @param query the query to search for
   * @returns the players that match the query, or undefined if no players were found
   */
  async searchPlayers(query: string): Promise<ScoreSaberPlayerSearchToken | undefined> {
    const before = performance.now();
    this.log(`Searching for players matching "${query}"...`);
    const results = await this.fetch<ScoreSaberPlayerSearchToken>(SEARCH_PLAYERS_ENDPOINT.replace(":query", query));
    if (results === undefined) {
      return undefined;
    }
    if (results.players.length === 0) {
      return undefined;
    }
    results.players.sort((a, b) => a.rank - b.rank);
    this.log(`Found ${results.players.length} players in ${(performance.now() - before).toFixed(0)}ms`);
    return results;
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param apiUrl the url to the API for SSR
   * @returns the player that matches the ID, or undefined
   */
  async lookupPlayer(
    playerId: string,
    apiUrl: string
  ): Promise<
    | {
        player: ScoreSaberPlayer;
        rawPlayer: ScoreSaberPlayerToken;
      }
    | undefined
  > {
    const before = performance.now();
    this.log(`Looking up player "${playerId}"...`);
    const token = await this.fetch<ScoreSaberPlayerToken>(LOOKUP_PLAYER_ENDPOINT.replace(":id", playerId));
    if (token === undefined) {
      return undefined;
    }
    this.log(`Found player "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`);
    return {
      player: await getScoreSaberPlayerFromToken(apiUrl, token),
      rawPlayer: token,
    };
  }

  /**
   * Lookup players on a specific page
   *
   * @param page the page to get players for
   * @returns the players on the page, or undefined
   */
  async lookupPlayers(page: number): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up players on page "${page}"...`);
    const response = await this.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_ENDPOINT.replace(":page", page.toString())
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(`Found ${response.players.length} players in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Lookup players on a specific page and country
   *
   * @param page the page to get players for
   * @param country the country to get players for
   * @returns the players on the page, or undefined
   */
  async lookupPlayersByCountry(page: number, country: string): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up players on page "${page}" for country "${country}"...`);
    const response = await this.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT.replace(":page", page.toString()).replace(":country", country)
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(`Found ${response.players.length} players in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Looks up a page of scores for a player
   *
   * @param playerId the ID of the player to look up
   * @param sort the sort to use
   * @param page the page to get scores for
   * @param search
   * @returns the scores of the player, or undefined
   */
  async lookupPlayerScores({
    playerId,
    sort,
    page,
    search,
  }: {
    playerId: string;
    sort: ScoreSort;
    page: number;
    search?: string;
    useProxy?: boolean;
  }): Promise<ScoreSaberPlayerScoresPageToken | undefined> {
    const before = performance.now();
    this.log(
      `Looking up scores for player "${playerId}", sort "${sort}", page "${page}"${search ? `, search "${search}"` : ""}...`
    );
    const response = await this.fetch<ScoreSaberPlayerScoresPageToken>(
      LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":id", playerId)
        .replace(":limit", 8 + "")
        .replace(":sort", sort)
        .replace(":page", page + "") + (search ? `&search=${search}` : "")
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.playerScores.length} scores for player "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Looks up a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   */
  async lookupLeaderboard(leaderboardId: string): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    this.log(`Looking up leaderboard "${leaderboardId}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardToken>(
      LOOKUP_LEADERBOARD_ENDPOINT.replace(":id", leaderboardId)
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(`Found leaderboard "${leaderboardId}" in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Looks up a page of scores for a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   * @param page the page to get scores for
   * @returns the scores of the leaderboard, or undefined
   */
  async lookupLeaderboardScores(
    leaderboardId: string,
    page: number
  ): Promise<ScoreSaberLeaderboardScoresPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up scores for leaderboard "${leaderboardId}", page "${page}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardScoresPageToken>(
      LOOKUP_LEADERBOARD_SCORES_ENDPOINT.replace(":id", leaderboardId).replace(":page", page.toString())
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.scores.length} scores for leaderboard "${leaderboardId}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }
}

export const scoresaberService = new ScoreSaberService();
