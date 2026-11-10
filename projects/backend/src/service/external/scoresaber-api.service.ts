import { CooldownPriority } from "@ssr/common/cooldown";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { PlayerRefreshResponse } from "@ssr/common/schemas/response/player/player-refresh";
import { ScoreSaberRankingRequestsResponse } from "@ssr/common/schemas/response/scoresaber/ranking-requests";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberLeaderboardToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard";
import { ScoreSaberLeaderboardScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard-scores-page";
import { ScoreSaberPlayerScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v1/player-scores-page";
import { RankingRequestToken } from "@ssr/common/schemas/scoresaber/tokens/v1/ranking-request-token";
import { ScoreSaberV2LeaderboardScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v2/leaderboard/leaderboard-scores-page";
import { ScoreSaberV2LeaderboardStatusToken } from "@ssr/common/schemas/scoresaber/tokens/v2/leaderboard/leaderboard-status";
import { ScoreSaberV2LeaderboardsPageToken } from "@ssr/common/schemas/scoresaber/tokens/v2/leaderboard/leaderboards-page";
import { ScoreSaberV2PlayerToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { ScoreSaberV2PlayersPageToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/players-page";
import { ScoreSaberV2RealmToken } from "@ssr/common/schemas/scoresaber/tokens/v2/realm/realm";
import { ScoreSaberV2RealmPpCurveToken } from "@ssr/common/schemas/scoresaber/tokens/v2/realm/realm-pp-curve";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { getScoreSaberLeaderboardFromV2PageToken } from "@ssr/common/token-creators";
import { CoalescingLoader } from "@ssr/common/utils/coalescing-loader";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { getQueryParamsFromObject } from "@ssr/common/utils/utils";
import { scoreSaberApiResponseCacheKey } from "../../common/cache-keys";
import CacheService, { CacheId } from "../infra/cache.service";

const scoreSaberApiLog = Logger.withTopic("ScoreSaber API");

const API_BASE = "https://scoresaber.com/api";

/**
 * Player
 */
const LOOKUP_PLAYER_V2_ENDPOINT = `${API_BASE}/v2/players/:id`;
const LOOKUP_PLAYERS_V2_ENDPOINT = `${API_BASE}/v2/players`;
const LOOKUP_PLAYER_SCORES_ENDPOINT = `${API_BASE}/player/:id/scores?limit=:limit&sort=:sort&page=:page`;
const LOOKUP_ACTIVE_PLAYER_COUNT = `${API_BASE}/v2/players/count`;
const REFRESH_PLAYER_ENDPOINT = `${API_BASE}/user/:id/refresh`;

/**
 * Leaderboard
 */
const LOOKUP_LEADERBOARD_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/info`;
const LOOKUP_LEADERBOARD_BY_HASH_ENDPOINT = `${API_BASE}/leaderboard/by-hash/:query/info?difficulty=:difficulty&gameMode=:gameMode`;
const LOOKUP_LEADERBOARD_SCORES_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/scores?page=:page`;
/**
 * Ranking Queue
 */
const RANKING_REQUESTS_ENDPOINT = `${API_BASE}/ranking/requests/:query`;

/**
 * v2 endpoints
 */
const LOOKUP_LEADERBOARDS_V2_ENDPOINT = `${API_BASE}/v2/leaderboards`;

/**
 * Realms
 */
const LOOKUP_LEADERBOARD_SCORES_V2_ENDPOINT = `${API_BASE}/v2/leaderboards/:id/scores`;
const LOOKUP_REALMS_V2_ENDPOINT = `${API_BASE}/v2/realms`;
const LOOKUP_REALM_PP_CURVE_V2_ENDPOINT = `${API_BASE}/v2/realms/:id/pp-curve`;

/**
 * ScoreSaber's v2 list endpoints currently reject `realmId` ("expected number, received string"),
 * so it is only sent for non-default realms; the default realm is what they return when it is omitted.
 *
 * @param realmId the realm to resolve, if any
 * @returns the search params to spread into a request
 */
function realmSearchParam(realmId?: number): { realmId?: string } {
  return realmId != null && realmId !== DEFAULT_REALM_ID ? { realmId: realmId.toString() } : {};
}

type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | {
      [key: string]: SerializableValue;
    };

/**
 * Fills the `:name` placeholders of an endpoint template with URL-encoded values.
 * A replacer function is used so `$` sequences in values are never interpreted.
 */
function fillEndpoint(template: string, values: Record<string, string | number>): string {
  let result = template;
  for (const [name, value] of Object.entries(values)) {
    result = result.replace(`:${name}`, () => encodeURIComponent(String(value)));
  }
  return result;
}

export class ScoreSaberApiService {
  public static totalRequests: number = 0;
  public static failedRequests: number = 0;
  private static totalRequestLatencyMs: number = 0;
  private static coalescingLoader = new CoalescingLoader<string, SerializableValue | undefined>();

  /** Max attempts per logical request (including the first). */
  private static readonly MAX_ATTEMPTS = 5;
  /** Base delay for the exponential backoff (ms). */
  private static readonly BACKOFF_BASE_MS = 500;
  /** Upper bound for the exponential backoff delay (ms). */
  private static readonly BACKOFF_MAX_MS = 10_000;
  /** Upper bound for honoring a server-provided `Retry-After` (ms). */
  private static readonly RETRY_AFTER_MAX_MS = 30_000;
  /** Per-request timeout (ms). */
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

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
      searchParams?: Record<string, string>;
      /** Skips the short-lived response cache; concurrent identical requests still coalesce. */
      skipCache?: boolean;
    }
  ): Promise<T | undefined> {
    const startedAt = performance.now();
    const { skipCache, ...requestOptions } = options ?? {};
    options = Object.keys(requestOptions).length > 0 ? requestOptions : undefined;
    const cacheHash = Bun.hash(JSON.stringify({ url, options })).toString();

    if (skipCache) {
      const fresh = (await ScoreSaberApiService.coalescingLoader.get(cacheHash, async () => {
        return await ScoreSaberApiService.request(url, options);
      })) as SerializableValue | undefined;
      ScoreSaberApiService.totalRequestLatencyMs += Math.max(0, performance.now() - startedAt);
      return fresh as T;
    }

    const data = await CacheService.fetch<SerializableValue | undefined>(
      CacheId.SCORESABER_API_RESPONSE,
      scoreSaberApiResponseCacheKey(cacheHash),
      async () =>
        (await ScoreSaberApiService.coalescingLoader.get(cacheHash, async () => {
          return await ScoreSaberApiService.request(url, options);
        })) as SerializableValue | undefined
    );

    ScoreSaberApiService.totalRequestLatencyMs += Math.max(0, performance.now() - startedAt);
    return data as T;
  }

  /**
   * Executes a ScoreSaber API request with retries and returns the parsed JSON.
   *
   * Transient failures (network error, timeout, JSON parse failure, 429, 5xx)
   * are retried up to {@link MAX_ATTEMPTS} times with exponential backoff,
   * honoring `Retry-After` when present; a definitive non-200 (e.g. 404) is
   * returned immediately as "no result". Returns undefined only when every
   * attempt failed.
   */
  private static async request(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
    }
  ): Promise<SerializableValue | undefined> {
    ScoreSaberApiService.totalRequests++;

    for (let attempt = 1; attempt <= ScoreSaberApiService.MAX_ATTEMPTS; attempt++) {
      const result = await ScoreSaberApiService.requestOnce(url, options);

      if (result == undefined) {
        // Transport failure — retry unless we exhausted the attempts.
        if (attempt < ScoreSaberApiService.MAX_ATTEMPTS) {
          await ScoreSaberApiService.backoff(attempt);
          continue;
        }
        ScoreSaberApiService.failedRequests++;
        return undefined;
      }

      // 429 / 5xx are transient — retry (honoring Retry-After). Every other
      // status (2xx, 3xx, 4xx like 404) is a definitive answer.
      if ((result.status === 429 || result.status >= 500) && attempt < ScoreSaberApiService.MAX_ATTEMPTS) {
        await ScoreSaberApiService.backoff(attempt, result.retryAfterMs);
        continue;
      }

      if (result.status !== 200) {
        ScoreSaberApiService.failedRequests++;
        return undefined;
      }

      return result.data;
    }

    return undefined;
  }

  /**
   * Executes a single ScoreSaber API request attempt.
   *
   * @returns the response status, parsed JSON and `Retry-After` delay, or
   *   undefined when the request failed before an HTTP response was received
   *   (network error, timeout, JSON parse failure)
   */
  private static async requestOnce(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
    }
  ): Promise<{ status: number; data: SerializableValue | undefined; retryAfterMs?: number } | undefined> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ScoreSaberApiService.REQUEST_TIMEOUT_MS);

    let response: Response | undefined;
    try {
      response = await fetch(
        `${env.PROXY_URL}/${encodeURIComponent(`${url}${getQueryParamsFromObject(options?.searchParams || {})}`)}`,
        {
          signal: controller.signal,
        }
      );
    } catch {
      return undefined;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response) {
      return undefined;
    }

    let data: SerializableValue | undefined;
    try {
      data = (await response.json()) as SerializableValue;
    } catch {
      // A non-JSON body is still a definitive HTTP status (e.g. an HTML 404
      // page) — don't treat it as a transport failure and retry.
      return {
        status: response.status,
        data: undefined,
        retryAfterMs: ScoreSaberApiService.parseRetryAfterMs(response),
      };
    }

    return {
      status: response.status,
      data,
      retryAfterMs: ScoreSaberApiService.parseRetryAfterMs(response),
    };
  }

  private static parseRetryAfterMs(response: Response): number | undefined {
    const header = response.headers.get("retry-after");
    if (!header) {
      return undefined;
    }
    const seconds = Number(header);
    if (Number.isFinite(seconds)) {
      return Math.max(0, Math.min(seconds * 1000, ScoreSaberApiService.RETRY_AFTER_MAX_MS));
    }
    const date = new Date(header).getTime();
    return Number.isFinite(date)
      ? Math.max(0, Math.min(date - Date.now(), ScoreSaberApiService.RETRY_AFTER_MAX_MS))
      : undefined;
  }

  private static async backoff(attempt: number, retryAfterMs?: number): Promise<void> {
    if (retryAfterMs != null) {
      await new Promise(resolve => setTimeout(resolve, retryAfterMs));
      return;
    }
    const exponentialMs = Math.min(
      ScoreSaberApiService.BACKOFF_BASE_MS * 2 ** (attempt - 1),
      ScoreSaberApiService.BACKOFF_MAX_MS
    );
    // Full jitter avoids a thundering herd of retries after a shared rate limit.
    const delayMs = exponentialMs / 2 + Math.random() * (exponentialMs / 2);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Gets the players that match the query.
   *
   * @param query the query to search for
   * @returns the players that match the query, or undefined if no players were found
   */
  public static async searchPlayers(query: string): Promise<ScoreSaberV2PlayersPageToken | undefined> {
    const before = performance.now();
    const trimmedQuery = query.trim();
    ScoreSaberApiService.log(`Searching for players matching "${trimmedQuery}"...`);
    const results = await ScoreSaberApiService.fetch<ScoreSaberV2PlayersPageToken>(
      LOOKUP_PLAYERS_V2_ENDPOINT,
      {
        searchParams: {
          page: "1",
          ...(trimmedQuery ? { search: trimmedQuery } : {}),
        },
      }
    );
    if (results === undefined || results.data.length === 0) {
      return undefined;
    }
    results.data.sort((a, b) => a.stats.rank - b.stats.rank);
    ScoreSaberApiService.log(
      `Found ${results.data.length} players in ${formatDuration(performance.now() - before)}`
    );
    return results;
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param realmId the realm to resolve the player's stats for (the default realm when omitted)
   * @returns the player that matches the ID, or undefined
   */
  public static async lookupPlayer(
    playerId: string,
    realmId?: number
  ): Promise<ScoreSaberV2PlayerToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up player "${playerId}"...`);
    const token = await ScoreSaberApiService.fetch<ScoreSaberV2PlayerToken>(
      fillEndpoint(LOOKUP_PLAYER_V2_ENDPOINT, { id: playerId }),
      // Player profiles are cached for long by the player cache, which must never pin a stale response.
      { skipCache: true, ...(realmId != null ? { searchParams: { realmId: realmId.toString() } } : {}) }
    );
    if (token === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(`Found player "${playerId}" in ${formatDuration(performance.now() - before)}`);
    return token;
  }

  /**
   * Lookup players on a specific page
   *
   * @param page the page to get players for
   * @param options the options to use when looking up the players (optional)
   * @returns the players on the page, or undefined
   */
  public static async lookupPlayers(
    page: number,
    options?: {
      search?: string;
      country?: string;
      includeInactives?: boolean;
      realmId?: number;
    }
  ): Promise<ScoreSaberV2PlayersPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up players on page "${page}"...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberV2PlayersPageToken>(
      LOOKUP_PLAYERS_V2_ENDPOINT,
      {
        searchParams: {
          page: page.toString(),
          ...(options?.search ? { search: options.search } : {}),
          ...(options?.country ? { countries: options.country } : {}),
          ...(options?.includeInactives ? { includeInactive: options.includeInactives.toString() } : {}),
          ...realmSearchParam(options?.realmId),
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found ${response.data.length} players in ${formatDuration(performance.now() - before)}`
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
    const response = await ScoreSaberApiService.fetch<{ count: number }>(LOOKUP_ACTIVE_PLAYER_COUNT);
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(`Found active player count in ${formatDuration(performance.now() - before)}`);
    return response.count;
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
      fillEndpoint(LOOKUP_PLAYER_SCORES_ENDPOINT, { id: playerId, limit, sort, page }) +
        (search ? `&search=${encodeURIComponent(search)}` : "")
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
    leaderboardId: string | number
  ): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up leaderboard "${leaderboardId}"...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberLeaderboardToken>(
      fillEndpoint(LOOKUP_LEADERBOARD_ENDPOINT, { id: leaderboardId })
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
    difficulty: number,
    gameMode: string
  ): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(
      `Looking up leaderboard by hash for "${hash}", difficulty "${difficulty}", gamemode "${gameMode}"...`
    );
    const response = await ScoreSaberApiService.fetch<ScoreSaberLeaderboardToken>(
      fillEndpoint(LOOKUP_LEADERBOARD_BY_HASH_ENDPOINT, { query: hash, difficulty, gameMode })
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
      limit?: number;
      status?: ScoreSaberV2LeaderboardStatusToken | ScoreSaberV2LeaderboardStatusToken[];
      verified?: boolean;
      minStars?: number;
      maxStars?: number;
      search?: string;
      sortBy?: "createdAt" | "rankedAt" | "stars" | "totalScores" | "dailyScores" | "trending";
      sortDirection?: "asc" | "desc";
      realmId?: number;
    }
  ): Promise<ScoreSaberV2LeaderboardsPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up leaderboard page "${page}"...`);

    const response = await ScoreSaberApiService.fetch<ScoreSaberV2LeaderboardsPageToken>(
      LOOKUP_LEADERBOARDS_V2_ENDPOINT,
      {
        searchParams: {
          page: page.toString(),
          ...(options?.limit ? { limit: options.limit.toString() } : {}),
          ...(options?.status
            ? {
                status: Array.isArray(options.status) ? options.status.join(",") : options.status,
              }
            : {}),
          ...(options?.verified ? { verified: "true" } : {}),
          ...(options?.minStars != null ? { minStars: options.minStars.toString() } : {}),
          ...(options?.maxStars != null ? { maxStars: options.maxStars.toString() } : {}),
          ...(options?.search ? { search: options.search } : {}),
          ...(options?.sortBy ? { sortBy: options.sortBy } : {}),
          ...(options?.sortDirection ? { sortDirection: options.sortDirection } : {}),
          ...realmSearchParam(options?.realmId),
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found ${response.data.length} leaderboards in ${formatDuration(performance.now() - before)}`
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
    leaderboardId: number,
    page: number,
    options?: {
      country?: string;
    }
  ): Promise<ScoreSaberLeaderboardScoresPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up scores for leaderboard "${leaderboardId}", page "${page}"...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberLeaderboardScoresPageToken>(
      fillEndpoint(LOOKUP_LEADERBOARD_SCORES_ENDPOINT, { id: leaderboardId, page }) +
        (options?.country ? `&countries=${encodeURIComponent(options.country)}` : "")
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
   * Looks up a page of a leaderboard's scores as seen by a realm (v2), which carries the realm's own pp.
   *
   * @param leaderboardId the ID of the leaderboard to look up
   * @param page the page to get scores for
   * @param realmId the realm to resolve pp for
   * @returns the scores of the leaderboard in the realm, or undefined
   */
  public static async lookupLeaderboardRealmScores(
    leaderboardId: number,
    page: number,
    realmId: number
  ): Promise<ScoreSaberV2LeaderboardScoresPageToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(
      `Looking up realm "${realmId}" scores for leaderboard "${leaderboardId}", page "${page}"...`
    );
    const response = await ScoreSaberApiService.fetch<ScoreSaberV2LeaderboardScoresPageToken>(
      LOOKUP_LEADERBOARD_SCORES_V2_ENDPOINT.replace(":id", leaderboardId.toString()),
      {
        searchParams: {
          page: page.toString(),
          limit: "100",
          ...realmSearchParam(realmId),
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found ${response.data.length} realm "${realmId}" scores for leaderboard "${leaderboardId}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Looks up all of the realms.
   *
   * @returns the realms, or undefined
   */
  public static async lookupRealms(): Promise<ScoreSaberV2RealmToken[] | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up realms...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberV2RealmToken[]>(LOOKUP_REALMS_V2_ENDPOINT);
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found ${response.length} realms in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Looks up the pp curve of a realm.
   *
   * @param realmId the ID of the realm
   * @returns the pp curve of the realm, or undefined
   */
  public static async lookupRealmPpCurve(
    realmId: number
  ): Promise<ScoreSaberV2RealmPpCurveToken | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up pp curve for realm "${realmId}"...`);
    const response = await ScoreSaberApiService.fetch<ScoreSaberV2RealmPpCurveToken>(
      LOOKUP_REALM_PP_CURVE_V2_ENDPOINT.replace(":id", realmId.toString())
    );
    if (response === undefined) {
      return undefined;
    }
    ScoreSaberApiService.log(
      `Found pp curve for realm "${realmId}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  /**
   * Gets the ranking requests.
   *
   * @returns the ranking requests
   */
  public static async lookupRankingRequests(): Promise<ScoreSaberRankingRequestsResponse | undefined> {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up ranking requests...`);

    const [nextInQueueResponse, openRankUnrankResponse] = await Promise.all([
      ScoreSaberApiService.fetch<RankingRequestToken[]>(RANKING_REQUESTS_ENDPOINT.replace(":query", "top")),
      ScoreSaberApiService.fetch<RankingRequestToken[]>(
        RANKING_REQUESTS_ENDPOINT.replace(":query", "belowTop")
      ),
    ]);

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
      fillEndpoint(REFRESH_PLAYER_ENDPOINT, { id })
    );
    return result;
  }

  /**
   * Gets all leaderboards from the ScoreSaber API.
   *
   * @param status the status of the leaderboards to fetch
   * @param logProgress whether to log progress
   * @returns the leaderboards
   */
  public static async getAllLeaderboards(
    status: "ranked" | "qualified",
    logProgress: boolean = false,
    realmId?: number
  ): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    leaderboardDifficulties: Map<string, ScoreSaberLeaderboardDifficulty[]>;
  }> {
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const leaderboardDifficulties: Map<string, ScoreSaberLeaderboardDifficulty[]> = new Map();

    let hasMorePages = true;
    let page = 1;

    while (hasMorePages) {
      const response = await ScoreSaberApiService.lookupLeaderboards(page, {
        status: status === "ranked" ? "RANKED" : "QUALIFIED",
        limit: 100,
        realmId,
      });
      if (!response) {
        hasMorePages = false;
        continue;
      }

      const totalPages = Math.ceil(response.metadata.totalItems / response.metadata.itemsPerPage);
      for (const token of response.data) {
        const leaderboard = getScoreSaberLeaderboardFromV2PageToken(token);
        leaderboards.push(leaderboard);

        const difficulties = leaderboardDifficulties.get(leaderboard.songHash) ?? [];
        difficulties.push({
          id: leaderboard.id,
          stars: leaderboard.difficulty.stars,
          difficulty: leaderboard.difficulty.difficulty,
          characteristic: leaderboard.difficulty.characteristic,
        });
        leaderboardDifficulties.set(leaderboard.songHash, difficulties);
      }

      if (logProgress && (page % 10 === 0 || page === 1 || page >= totalPages)) {
        scoreSaberApiLog.info(`Fetched ${response.data.length} leaderboards on page ${page}/${totalPages}.`);
      }

      page++;
      hasMorePages = page <= totalPages;
    }

    return { leaderboards, leaderboardDifficulties };
  }

  private static log(message: string): void {
    scoreSaberApiLog.debug(message);
  }

  public static getAverageLatencyMs(): number {
    if (ScoreSaberApiService.totalRequests <= 0) {
      return 0;
    }
    return ScoreSaberApiService.totalRequestLatencyMs / ScoreSaberApiService.totalRequests;
  }
}
