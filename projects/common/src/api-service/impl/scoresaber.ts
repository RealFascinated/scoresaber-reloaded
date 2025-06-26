import { Cooldown, CooldownPriority, cooldownRequestsPerMinute } from "../../cooldown";
import { DetailType } from "../../detail-type";
import { StarFilter } from "../../maps/types";
import { PlayerRefreshResponse } from "../../response/player-refresh-response";
import ScoreSaberRankingRequestsResponse from "../../response/scoresaber-ranking-requests-response";
import { MapDifficulty } from "../../score/map-difficulty";
import { ScoreSaberScoreSort } from "../../score/score-sort";
import ScoreSaberLeaderboardToken from "../../types/token/scoresaber/leaderboard";
import ScoreSaberLeaderboardPageToken from "../../types/token/scoresaber/leaderboard-page";
import ScoreSaberLeaderboardScoresPageToken from "../../types/token/scoresaber/leaderboard-scores-page";
import { ScoreSaberPlayerToken } from "../../types/token/scoresaber/player";
import ScoreSaberPlayerScoresPageToken from "../../types/token/scoresaber/player-scores-page";
import { ScoreSaberPlayerSearchToken } from "../../types/token/scoresaber/player-search";
import { ScoreSaberPlayersPageToken } from "../../types/token/scoresaber/players-page";
import RankingRequestToken from "../../types/token/scoresaber/ranking-request-token";
import { getDifficulty } from "../../utils/song-utils";
import { formatDuration } from "../../utils/time-utils";
import ApiService from "../api-service";
import { ApiServiceName } from "../api-service-registry";

const API_BASE = "https://scoresaber.com/api";

/**
 * Player
 */
const SEARCH_PLAYERS_ENDPOINT = `${API_BASE}/players?search=:query`;
const LOOKUP_PLAYER_ENDPOINT = `${API_BASE}/player/:id/:type`;
const LOOKUP_PLAYERS_ENDPOINT = `${API_BASE}/players?page=:page`;
const LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT = `${API_BASE}/players?page=:page&countries=:country`;
const LOOKUP_PLAYER_SCORES_ENDPOINT = `${API_BASE}/player/:id/scores?limit=:limit&sort=:sort&page=:page`;
const LOOKUP_ACTIVE_PLAYER_COUNT = `${API_BASE}/players/count`;
const REFRESH_PLAYER_ENDPOINT = `${API_BASE}/user/:id/refresh`;

/**
 * Leaderboard
 */
const LOOKUP_LEADERBOARD_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/info`;
const LOOKUP_LEADERBOARD_BY_HASH_ENDPOINT = `${API_BASE}/leaderboard/by-hash/:query/info?difficulty=:difficulty&gameMode=:gameMode`;
const LOOKUP_LEADERBOARD_SCORES_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/scores?page=:page`;
const LOOKUP_LEADERBOARDS_ENDPOINT = `${API_BASE}/leaderboards`;
const SEARCH_LEADERBOARDS_ENDPOINT = `${API_BASE}/leaderboards?search=:query`;

/**
 * Ranking Queue
 */
const RANKING_REQUESTS_ENDPOINT = `${API_BASE}/ranking/requests/:query`;

export class ScoreSaberService extends ApiService {
  constructor() {
    super(
      new Cooldown(cooldownRequestsPerMinute(200), 150, cooldownRequestsPerMinute(200), 100),
      ApiServiceName.SCORE_SABER
    );
  }

  /**
   * Gets the players that match the query.
   *
   * @param query the query to search for
   * @returns the players that match the query, or undefined if no players were found
   */
  public async searchPlayers(query: string): Promise<ScoreSaberPlayerSearchToken | undefined> {
    const before = performance.now();
    this.log(`Searching for players matching "${query}"...`);
    const results = await this.fetch<ScoreSaberPlayerSearchToken>(
      SEARCH_PLAYERS_ENDPOINT.replace(":query", query)
    );
    if (results === undefined) {
      return undefined;
    }
    if (results.players.length === 0) {
      return undefined;
    }
    results.players.sort((a, b) => a.rank - b.rank);
    this.log(
      `Found ${results.players.length} players in ${formatDuration(performance.now() - before)}`
    );
    return results;
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param type the data type to return
   * @returns the player that matches the ID, or undefined
   */
  public async lookupPlayer(
    playerId: string,
    type: DetailType = DetailType.FULL
  ): Promise<ScoreSaberPlayerToken | undefined> {
    const before = performance.now();
    this.log(`Looking up player "${playerId}"...`);
    const token = await this.fetch<ScoreSaberPlayerToken>(
      LOOKUP_PLAYER_ENDPOINT.replace(":id", playerId).replace(":type", type)
    );
    if (token === undefined) {
      return undefined;
    }
    this.log(`Found player "${playerId}" in ${formatDuration(performance.now() - before)}`);
    return token;
  }

  /**
   * Lookup players on a specific page
   *
   * @param page the page to get players for
   * @returns the players on the page, or undefined
   */
  public async lookupPlayers(
    page: number,
    search?: string
  ): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up players on page "${page}"...`);
    const response = await this.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_ENDPOINT.replace(":page", page.toString()) +
        (search ? `&search=${search}` : "")
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.players.length} players in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Lookup players on a specific page and country
   *
   * @param page the page to get players for
   * @param country the country to get players for
   * @returns the players on the page, or undefined
   */
  public async lookupPlayersByCountry(
    page: number,
    country: string,
    search?: string
  ): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up players on page "${page}" for country "${country}"...`);
    const response = await this.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT.replace(":page", page.toString()).replace(
        ":country",
        country
      ) + (search ? `&search=${search}` : "")
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.players.length} players in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Gets the active player count.
   *
   * @returns the active player count
   */
  public async lookupActivePlayerCount(): Promise<number | undefined> {
    const before = performance.now();
    this.log(`Looking up active player count...`);
    const response = await this.fetch<number>(LOOKUP_ACTIVE_PLAYER_COUNT);
    if (response === undefined) {
      return undefined;
    }
    this.log(`Found active player count in ${formatDuration(performance.now() - before)}`);
    return response;
  }

  /**
   * Looks up a page of scores for a player
   *
   * @param playerId the ID of the player to look up
   * @param sort the sort to use
   * @param limit the amount of sores to fetch
   * @param page the page to get scores for
   * @param search the query to search for
   * @returns the scores of the player, or undefined
   */
  public async lookupPlayerScores({
    playerId,
    sort,
    limit = 8,
    page,
    search,
    priority = CooldownPriority.NORMAL,
  }: {
    playerId: string;
    sort: ScoreSaberScoreSort;
    limit?: number;
    page: number;
    search?: string;
    priority?: CooldownPriority;
  }): Promise<ScoreSaberPlayerScoresPageToken | undefined> {
    const before = performance.now();
    this.log(
      `Looking up scores for player "${playerId}", sort "${sort}", page "${page}"${search ? `, search "${search}"` : ""}...`
    );
    const response = await this.fetch<ScoreSaberPlayerScoresPageToken>(
      LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":id", playerId)
        .replace(":limit", limit + "")
        .replace(":sort", sort)
        .replace(":page", page + "") + (search ? `&search=${search}` : ""),
      {
        priority,
      }
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.playerScores.length} scores for player "${playerId}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Looks up a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   */
  public async lookupLeaderboard(
    leaderboardId: string | number,
    options?: {
      priority?: CooldownPriority;
    }
  ): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    this.log(`Looking up leaderboard "${leaderboardId}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardToken>(
      LOOKUP_LEADERBOARD_ENDPOINT.replace(":id", leaderboardId.toString()),
      {
        ...(options?.priority ? { priority: options.priority } : {}),
      }
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found leaderboard "${leaderboardId}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Looks up a leaderboard by its hash
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param gameMode the game mode to get
   */
  public async lookupLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    gameMode: string
  ): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    this.log(
      `Looking up leaderboard by hash for "${hash}", difficulty "${difficulty}", gamemode "${gameMode}"...`
    );
    const response = await this.fetch<ScoreSaberLeaderboardToken>(
      LOOKUP_LEADERBOARD_BY_HASH_ENDPOINT.replace(":query", hash)
        .replace(":difficulty", getDifficulty(difficulty).id + "")
        .replace(":gameMode", gameMode)
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found leaderboard by hash for "${hash}", difficulty "${difficulty}", gamemode "${gameMode}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Looks up a page of leaderboards
   *
   * @param page the page to look up
   * @param options the options to use when looking up the leaderboards
   */
  public async lookupLeaderboards(
    page: number,
    options?: {
      ranked?: boolean;
      qualified?: boolean;
      verified?: boolean;
      category?: number;
      stars?: StarFilter;
      sort?: number;
      priority?: CooldownPriority;
    }
  ): Promise<ScoreSaberLeaderboardPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up leaderboard page "${page}"...`);

    const response = await this.fetch<ScoreSaberLeaderboardPageToken>(
      LOOKUP_LEADERBOARDS_ENDPOINT,
      {
        searchParams: {
          page: page.toString(),
          ...(options?.ranked ? { ranked: options.ranked } : {}),
          ...(options?.qualified ? { qualified: options.qualified } : {}),
          ...(options?.verified ? { verified: options.verified } : {}),
          ...(options?.category ? { category: options.category } : {}),
          ...(options?.stars
            ? { minStar: options.stars.min ?? 0, maxStar: options.stars.max }
            : {}),
          ...(options?.sort ? { sort: options.sort } : {}),
        },
        ...(options?.priority ? { priority: options.priority } : {}),
      }
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.leaderboards.length} leaderboards in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Searches for leaderboards
   *
   * @param query the query to search for
   */
  public async searchLeaderboards(
    query: string
  ): Promise<ScoreSaberLeaderboardPageToken | undefined> {
    const before = performance.now();
    this.log(`Searching for leaderboards matching "${query}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardPageToken>(
      SEARCH_LEADERBOARDS_ENDPOINT.replace(":query", query)
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.leaderboards.length} leaderboards in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Looks up a page of scores for a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   * @param page the page to get scores for
   * @param country the country to get scores in
   * @returns the scores of the leaderboard, or undefined
   */
  public async lookupLeaderboardScores(
    leaderboardId: string | number,
    page: number,
    options?: {
      country?: string;
      priority?: CooldownPriority;
    }
  ): Promise<ScoreSaberLeaderboardScoresPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up scores for leaderboard "${leaderboardId}", page "${page}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardScoresPageToken>(
      LOOKUP_LEADERBOARD_SCORES_ENDPOINT.replace(":id", leaderboardId.toString()).replace(
        ":page",
        page.toString()
      ) + (options?.country ? `&countries=${options.country}` : ""),
      {
        ...(options?.priority ? { priority: options.priority } : {}),
      }
    );

    if (response === undefined) {
      return undefined;
    }

    this.log(
      `Found ${response.scores.length} scores for leaderboard "${leaderboardId}", page "${page}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Gets the ranking requests.
   *
   * @returns the ranking requests
   */
  public async lookupRankingRequests(): Promise<ScoreSaberRankingRequestsResponse | undefined> {
    const before = performance.now();
    this.log(`Looking up ranking requests...`);

    const nextInQueueResponse = await this.fetch<RankingRequestToken[]>(
      RANKING_REQUESTS_ENDPOINT.replace(":query", "top")
    );
    const openRankUnrankResponse = await this.fetch<RankingRequestToken[]>(
      RANKING_REQUESTS_ENDPOINT.replace(":query", "belowTop")
    );

    const response = nextInQueueResponse?.concat(openRankUnrankResponse || []);
    if (response === undefined) {
      return undefined;
    }

    this.log(
      `Found ${response.length} ranking requests in ${formatDuration(performance.now() - before)}`
    );
    return {
      nextInQueue: nextInQueueResponse || [],
      openRankUnrank: openRankUnrankResponse || [],
      all: response || [],
    };
  }

  /**
   * Refreshes a player
   *
   * @param id the id of the player to refresh
   * @returns the result of the refresh
   */
  public async refreshPlayer(id: string): Promise<PlayerRefreshResponse | undefined> {
    const result = await this.fetch<PlayerRefreshResponse>(
      REFRESH_PLAYER_ENDPOINT.replace(":id", id)
    );
    return result;
  }
}
