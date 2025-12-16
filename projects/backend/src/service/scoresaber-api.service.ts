import { SERVER_PROXIES } from "@ssr/common/api-service/api-service";
import { Cooldown, CooldownPriority, cooldownRequestsPerMinute } from "@ssr/common/cooldown";
import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import { StarFilter } from "@ssr/common/maps/types";
import { PlayerRefreshResponse } from "@ssr/common/schemas/response/player/player-refresh";
import ScoreSaberRankingRequestsResponse from "@ssr/common/schemas/response/scoresaber/ranking-requests";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import ScoreSaberLeaderboardPageToken from "@ssr/common/types/token/scoresaber/leaderboard-page";
import ScoreSaberLeaderboardScoresPageToken from "@ssr/common/types/token/scoresaber/leaderboard-scores-page";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberPlayerScoresPageToken from "@ssr/common/types/token/scoresaber/player-scores-page";
import { ScoreSaberPlayerSearchToken } from "@ssr/common/types/token/scoresaber/player-search";
import { ScoreSaberPlayersPageToken } from "@ssr/common/types/token/scoresaber/players-page";
import RankingRequestToken from "@ssr/common/types/token/scoresaber/ranking-request-token";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { getQueryParamsFromObject, isServer } from "@ssr/common/utils/utils";
import CacheService, { CacheId } from "./cache.service";

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

// 200 requests per minute per proxy
const FOREGROUND_RATE_LIMIT = 250 * SERVER_PROXIES.length;
const BACKGROUND_RATE_LIMIT = 150 * SERVER_PROXIES.length;

export class ScoreSaberApiService {
  private static readonly cooldown: Cooldown = new Cooldown(
    cooldownRequestsPerMinute(FOREGROUND_RATE_LIMIT),
    FOREGROUND_RATE_LIMIT,
    cooldownRequestsPerMinute(BACKGROUND_RATE_LIMIT),
    BACKGROUND_RATE_LIMIT
  );
  private static lastRateLimitSeen: number | undefined = undefined;
  private static currentProxy: string = ""; // No proxy by default
  private static proxyResetThreshold: number = 50;

  public constructor() {
    setInterval(() => {
      if (
        ScoreSaberApiService.lastRateLimitSeen &&
        ScoreSaberApiService.lastRateLimitSeen > ScoreSaberApiService.proxyResetThreshold &&
        ScoreSaberApiService.currentProxy !== "" // Already not using a proxy
      ) {
        // Reset to no proxy
        ScoreSaberApiService.currentProxy = "";
        Logger.info("Switched back to no proxy for ScoreSaber API requests");
      }
    }, 1000 * 30);
  }

  /**
   * Fetches data from the ScoreSaber API.
   *
   * @param url the url to fetch from
   * @param options the options to use when fetching
   * @returns the data from the API
   */
  private static async fetch<T>(
    url: string,
    options?: {
      priority?: CooldownPriority;
      searchParams?: Record<string, string>;
    }
  ): Promise<T | undefined> {
    const cacheHash = Bun.hash(JSON.stringify({ url, options })).toString();

    return CacheService.fetchWithCache(
      CacheId.ScoreSaberApi,
      `scoresaber:api-cache:${cacheHash}`,
      async () => {
        await ScoreSaberApiService.cooldown.waitAndUse(
          options?.priority || CooldownPriority.NORMAL
        );

        const response = await fetch(
          `${url}${getQueryParamsFromObject(options?.searchParams || {})}`
        );

        // Handle rate limit errors
        const remaining = response?.headers.get("x-ratelimit-remaining");
        if (isServer()) {
          if (remaining && Number(remaining) <= 50) {
            // Get the next proxy in the list (circular)
            const currentIndex = SERVER_PROXIES.indexOf(ScoreSaberApiService.currentProxy);
            const nextIndex = (currentIndex + 1) % SERVER_PROXIES.length;
            const nextProxy = SERVER_PROXIES[nextIndex];
            ScoreSaberApiService.currentProxy = nextProxy;
            Logger.info(
              `Rate limit exceeded for ScoreSaber API, switching to another proxy: ${nextProxy}`
            );
          }

          // Update the last rate limit seen
          ScoreSaberApiService.lastRateLimitSeen = Number(remaining);
        }

        if (!response.ok || response.status !== 200) {
          return undefined;
        }
        return (await response.json()) as T;
      }
    );
  }

  private static log(message: string): void {
    Logger.debug(`[ScoreSaberService] ${message}`);
  }

  /**
   * Gets the players that match the query.
   *
   * @param query the query to search for
   * @returns the players that match the query, or undefined if no players were found
   */
  public static async searchPlayers(
    query: string
  ): Promise<ScoreSaberPlayerSearchToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Searching for players matching "${query}"...`);
    const results = await ScoreSaberApiService.fetch<ScoreSaberPlayerSearchToken>(
      SEARCH_PLAYERS_ENDPOINT.replace(":query", query)
    );
    if (results === undefined || results.players.length === 0) {
      return undefined;
    }
    results.players.sort((a: ScoreSaberPlayerToken, b: ScoreSaberPlayerToken) => a.rank - b.rank);
    ScoreSaberApiService.log(
      `Found ${results.players.length} players in ${formatDuration(performance.now() - before)}`
    );
    return results;
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param type the data type to return (default: full)
   * @returns the player that matches the ID, or undefined
   */
  public static async lookupPlayer(
    playerId: string,
    type: DetailType = "full"
  ): Promise<ScoreSaberPlayerToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up player "${playerId}"...`);
    const token = await ScoreSaberApiService.fetch<ScoreSaberPlayerToken>(
      LOOKUP_PLAYER_ENDPOINT.replace(":id", playerId).replace(":type", type)
    );
    if (token === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found player "${playerId}" in ${formatDuration(performance.now() - before)}`
    );
    return token;
  }

  /**
   * Lookup players on a specific page
   *
   * @param page the page to get players for
   * @returns the players on the page, or undefined
   */
  public static async lookupPlayers(
    page: number,
    search?: string
  ): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up players on page "${page}"...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_ENDPOINT.replace(":page", page.toString()) +
        (search ? `&search=${search}` : "")
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
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
  public static async lookupPlayersByCountry(
    page: number,
    country: string,
    search?: string
  ): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up players on page "${page}" for country "${country}"...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT.replace(":page", page.toString()).replace(
        ":country",
        country
      ) + (search ? `&search=${search}` : "")
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found ${response.players.length} players in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Gets the active player count.
   *
   * @returns the active player count
   */
  public static async lookupActivePlayerCount(): Promise<number | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up active player count...`);
    const response = await ScoreSaberApiService.fetch<number>(LOOKUP_ACTIVE_PLAYER_COUNT);
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found active player count in ${formatDuration(performance.now() - before)}`
    );
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
  public static async lookupPlayerScores({
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
    ScoreSaberApiService.log(
      `Looking up scores for player "${playerId}", sort "${sort}", page "${page}"${search ? `, search "${search}"` : ""}...`
    );
    const response = await ScoreSaberApiService.fetch<ScoreSaberPlayerScoresPageToken>(
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
    ScoreSaberApiService.log(
      `Found ${response.playerScores.length} scores for player "${playerId}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Looks up a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   */
  public static async lookupLeaderboard(
    leaderboardId: string | number,
    priority?: CooldownPriority
  ): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up leaderboard "${leaderboardId}"...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberLeaderboardToken>(
      LOOKUP_LEADERBOARD_ENDPOINT.replace(":id", leaderboardId.toString()),
      {
        priority,
      }
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
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
  public static async lookupLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    gameMode: string
  ): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(
      `Looking up leaderboard by hash for "${hash}", difficulty "${difficulty}", gamemode "${gameMode}"...`
    );
    const response = await ScoreSaberApiService.fetch<ScoreSaberLeaderboardToken>(
      LOOKUP_LEADERBOARD_BY_HASH_ENDPOINT.replace(":query", hash)
        .replace(":difficulty", getDifficulty(difficulty).diffId + "")
        .replace(":gameMode", gameMode)
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
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
  public static async lookupLeaderboards(
    page: number,
    options?: {
      ranked?: boolean;
      qualified?: boolean;
      verified?: boolean;
      category?: number;
      stars?: StarFilter;
      sort?: number;
      priority?: CooldownPriority;
      search?: string;
    }
  ): Promise<ScoreSaberLeaderboardPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up leaderboard page "${page}"...`);

    const response = await ScoreSaberApiService.fetch<ScoreSaberLeaderboardPageToken>(
      LOOKUP_LEADERBOARDS_ENDPOINT,
      {
        searchParams: {
          page: page.toString(),
          ...(options?.ranked ? { ranked: options.ranked.toString() } : {}),
          ...(options?.qualified ? { qualified: options.qualified.toString() } : {}),
          ...(options?.verified ? { verified: options.verified.toString() } : {}),
          ...(options?.category ? { category: options.category.toString() } : {}),
          ...(options?.stars
            ? {
                minStar: (options.stars.min ?? 0).toString(),
                maxStar: (options.stars.max ?? 0).toString(),
              }
            : {}),
          ...(options?.sort ? { sort: options.sort.toString() } : {}),
          ...(options?.search ? { search: options.search } : {}),
        },
        ...(options?.priority ? { priority: options.priority } : {}),
      }
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found ${response.leaderboards.length} leaderboards in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Searches for leaderboards
   *
   * @param query the query to search for
   */
  public static async searchLeaderboards(
    query: string
  ): Promise<ScoreSaberLeaderboardPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Searching for leaderboards matching "${query}"...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberLeaderboardPageToken>(
      SEARCH_LEADERBOARDS_ENDPOINT.replace(":query", query)
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
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
  public static async lookupLeaderboardScores(
    leaderboardId: string | number,
    page: number,
    options?: {
      country?: string;
      priority?: CooldownPriority;
    }
  ): Promise<ScoreSaberLeaderboardScoresPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(
      `Looking up scores for leaderboard "${leaderboardId}", page "${page}"...`
    );
    const response = await ScoreSaberApiService.fetch<ScoreSaberLeaderboardScoresPageToken>(
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

    ScoreSaberApiService.log(
      `Found ${response.scores.length} scores for leaderboard "${leaderboardId}", page "${page}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Gets the ranking requests.
   *
   * @returns the ranking requests
   */
  public static async lookupRankingRequests(): Promise<
    ScoreSaberRankingRequestsResponse | undefined
  > {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up ranking requests...`);

    const nextInQueueResponse = await ScoreSaberApiService.fetch<RankingRequestToken[]>(
      RANKING_REQUESTS_ENDPOINT.replace(":query", "top")
    );
    const openRankUnrankResponse = await ScoreSaberApiService.fetch<RankingRequestToken[]>(
      RANKING_REQUESTS_ENDPOINT.replace(":query", "belowTop")
    );

    const response = nextInQueueResponse?.concat(openRankUnrankResponse || []);
    if (response === undefined) {
      return undefined;
    }

    ScoreSaberApiService.log(
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
  public static async refreshPlayer(id: string): Promise<PlayerRefreshResponse | undefined> {
    const result = await ScoreSaberApiService.fetch<PlayerRefreshResponse>(
      REFRESH_PLAYER_ENDPOINT.replace(":id", id)
    );
    return result;
  }
}
