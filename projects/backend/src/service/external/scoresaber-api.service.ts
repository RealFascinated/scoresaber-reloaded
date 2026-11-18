import { CooldownPriority } from "@ssr/common/cooldown";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { PlayerRefreshResponse } from "@ssr/common/schemas/response/player/player-refresh";
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
import ScoreSaberApiCallMetric, {
  type ScoreSaberApiOutcome,
} from "../../metrics/impl/backend/scoresaber-api-call";
import { MetricType } from "../../metrics/prometheus";
import CacheService, { CacheId } from "../infra/cache.service";
import MetricsService from "../infra/metrics.service";
import { backoff, parseRetryAfterMs } from "./http-retry";

const scoreSaberApiLog = Logger.withTopic("ScoreSaber API");

const API_BASE = "https://scoresaber.com/api";

const LOOKUP_PLAYER_V2_ENDPOINT = `${API_BASE}/v2/players/:id`;
const LOOKUP_PLAYERS_V2_ENDPOINT = `${API_BASE}/v2/players`;
const LOOKUP_PLAYER_SCORES_ENDPOINT = `${API_BASE}/player/:id/scores?limit=:limit&sort=:sort&page=:page`;
const LOOKUP_ACTIVE_PLAYER_COUNT = `${API_BASE}/v2/players/count`;
const REFRESH_PLAYER_ENDPOINT = `${API_BASE}/user/:id/refresh`;

const LOOKUP_LEADERBOARD_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/info`;
const LOOKUP_LEADERBOARD_BY_HASH_ENDPOINT = `${API_BASE}/leaderboard/by-hash/:query/info?difficulty=:difficulty&gameMode=:gameMode`;
const LOOKUP_LEADERBOARD_SCORES_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/scores?page=:page`;
const RANKING_REQUESTS_ENDPOINT = `${API_BASE}/ranking/requests/:query`;

const LOOKUP_LEADERBOARDS_V2_ENDPOINT = `${API_BASE}/v2/leaderboards`;

const LOOKUP_LEADERBOARD_SCORES_V2_ENDPOINT = `${API_BASE}/v2/leaderboards/:id/scores`;
const LOOKUP_REALMS_V2_ENDPOINT = `${API_BASE}/v2/realms`;
const LOOKUP_REALM_PP_CURVE_V2_ENDPOINT = `${API_BASE}/v2/realms/:id/pp-curve`;

function realmSearchParam(realmId?: number) {
  const params: { realmId?: string } =
    realmId != null && realmId !== DEFAULT_REALM_ID ? { realmId: realmId.toString() } : {};
  return params;
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

function fillEndpoint(template: string, values: Record<string, string | number>) {
  let result = template;
  for (const [name, value] of Object.entries(values)) {
    result = result.replace(`:${name}`, () => encodeURIComponent(String(value)));
  }
  return result;
}

type UpstreamResult = {
  status: number;
  data: SerializableValue | undefined;
  retryAfterMs: number | undefined;
};

const TIMEOUT_REASON = "scoresaber-request-timeout";
const SUPERSEDED_REASON = "scoresaber-request-superseded";

const ENDPOINT_LABELS: [RegExp, string][] = [
  [/^v2\/players\/count$/, "v2/players/count"],
  [/^v2\/players$/, "v2/players"],
  [/^v2\/players\/[^/]+$/, "v2/players/:id"],
  [/^player\/[^/]+\/scores$/, "player/:id/scores"],
  [/^user\/[^/]+\/refresh$/, "user/:id/refresh"],
  [/^leaderboard\/by-id\/[^/]+\/info$/, "leaderboard/by-id/:id/info"],
  [/^leaderboard\/by-id\/[^/]+\/scores$/, "leaderboard/by-id/:id/scores"],
  [/^leaderboard\/by-hash\/[^/]+\/info$/, "leaderboard/by-hash/:hash/info"],
  [/^ranking\/requests\/[^/]+$/, "ranking/requests/:query"],
  [/^v2\/leaderboards$/, "v2/leaderboards"],
  [/^v2\/leaderboards\/[^/]+\/scores$/, "v2/leaderboards/:id/scores"],
  [/^v2\/realms$/, "v2/realms"],
  [/^v2\/realms\/[^/]+\/pp-curve$/, "v2/realms/:id/pp-curve"],
];

function scoreSaberEndpointLabel(url: string) {
  const path = new URL(url).pathname.replace(/^\/api\//, "");
  return ENDPOINT_LABELS.find(([pattern]) => pattern.test(path))?.[1] ?? "other";
}

function outcomeForStatus(status: number) {
  const outcome: ScoreSaberApiOutcome =
    status === 429 ? "http_429" : status >= 500 ? "http_5xx" : status >= 400 ? "http_4xx" : "ok";
  return outcome;
}

function isUsableResult(result: UpstreamResult | undefined) {
  return result !== undefined && result.status !== 429 && result.status < 500;
}

export class ScoreSaberApiService {
  public static totalRequests: number = 0;
  public static failedRequests: number = 0;
  private static totalRequestLatencyMs: number = 0;
  private static coalescingLoader = new CoalescingLoader<string, SerializableValue | undefined>();

  private static readonly MAX_ATTEMPTS = 5;
  private static readonly REQUEST_TIMEOUT_MS = 5_000;
  private static readonly HEDGE_AFTER_MS = 750;
  private static readonly TOTAL_DEADLINE_MS = 10_000;

  private static async fetch<T>(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
      skipCache?: boolean;
    }
  ) {
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

  private static async request(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
    }
  ) {
    ScoreSaberApiService.totalRequests++;

    const startedAt = performance.now();
    const endpoint = scoreSaberEndpointLabel(url);

    for (let attempt = 1; attempt <= ScoreSaberApiService.MAX_ATTEMPTS; attempt++) {
      const remainingMs = ScoreSaberApiService.TOTAL_DEADLINE_MS - (performance.now() - startedAt);
      if (remainingMs <= 0) {
        break;
      }

      const result = await ScoreSaberApiService.requestHedged(
        url,
        endpoint,
        options,
        Math.min(ScoreSaberApiService.REQUEST_TIMEOUT_MS, remainingMs)
      );
      const canRetry = attempt < ScoreSaberApiService.MAX_ATTEMPTS;

      if (result == undefined) {
        if (canRetry) {
          await backoff(attempt);
          continue;
        }
        break;
      }

      if (result.status === 429 || result.status >= 500) {
        const waitMs = result.retryAfterMs ?? 0;
        const deadlineLeftMs = ScoreSaberApiService.TOTAL_DEADLINE_MS - (performance.now() - startedAt);
        if (canRetry && waitMs < deadlineLeftMs) {
          await backoff(attempt, result.retryAfterMs);
          continue;
        }
        break;
      }

      if (result.status !== 200) {
        break;
      }

      return result.data;
    }

    ScoreSaberApiService.failedRequests++;
    return undefined;
  }

  private static async requestHedged(
    url: string,
    endpoint: string,
    options: { searchParams?: Record<string, string> } | undefined,
    timeoutMs: number
  ) {
    const controllers: AbortController[] = [];
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      return await new Promise<UpstreamResult | undefined>(resolve => {
        let inFlight = 0;
        let finished = false;

        const finish = (result: UpstreamResult | undefined) => {
          if (finished) {
            return;
          }
          finished = true;
          resolve(result);
        };

        const launch = () => {
          const controller = new AbortController();
          controllers.push(controller);
          inFlight++;
          void ScoreSaberApiService.requestOnce(url, endpoint, options, controller.signal).then(result => {
            inFlight--;
            if (isUsableResult(result) || inFlight === 0) {
              finish(result);
            }
          });
        };

        timeoutTimer = setTimeout(() => {
          for (const controller of controllers) {
            controller.abort(TIMEOUT_REASON);
          }
          finish(undefined);
        }, timeoutMs);

        if (timeoutMs > ScoreSaberApiService.HEDGE_AFTER_MS) {
          hedgeTimer = setTimeout(launch, ScoreSaberApiService.HEDGE_AFTER_MS);
        }

        launch();
      });
    } finally {
      clearTimeout(hedgeTimer);
      clearTimeout(timeoutTimer);
      for (const controller of controllers) {
        controller.abort(SUPERSEDED_REASON);
      }
    }
  }

  private static async requestOnce(
    url: string,
    endpoint: string,
    options: { searchParams?: Record<string, string> } | undefined,
    signal: AbortSignal
  ) {
    const startedAt = performance.now();
    const observe = (outcome: ScoreSaberApiOutcome) => {
      MetricsService.getMetric<ScoreSaberApiCallMetric>(MetricType.SCORESABER_API_CALLS)?.observe(
        endpoint,
        outcome,
        performance.now() - startedAt
      );
    };
    const observeFailure = () => {
      if (!signal.aborted) {
        observe("network");
      } else if (signal.reason === TIMEOUT_REASON) {
        observe("timeout");
      }
    };

    let response: Response;
    try {
      response = await fetch(
        `${env.PROXY_URL}/${encodeURIComponent(`${url}${getQueryParamsFromObject(options?.searchParams || {})}`)}`,
        { signal }
      );
    } catch {
      observeFailure();
      return undefined;
    }

    let data: SerializableValue | undefined;
    try {
      data = (await response.json()) as SerializableValue;
    } catch {
      if (signal.aborted) {
        observeFailure();
        return undefined;
      }
    }

    observe(outcomeForStatus(response.status));
    return {
      status: response.status,
      data,
      retryAfterMs: parseRetryAfterMs(response),
    } satisfies UpstreamResult;
  }

  /**
   * Gets the players that match the query.
   *
   * @param query the query to search for
   * @returns the players that match the query, or undefined if no players were found
   */
  public static async searchPlayers(query: string) {
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
   * @param options `fresh` skips the 2 minute response cache, for callers that cache the result for long
   * @returns the player that matches the ID, or undefined
   */
  public static async lookupPlayer(playerId: string, realmId?: number, options?: { fresh?: boolean }) {
    const before = performance.now();
    ScoreSaberApiService.log(`Looking up player "${playerId}"...`);
    const token = await ScoreSaberApiService.fetch<ScoreSaberV2PlayerToken>(
      fillEndpoint(LOOKUP_PLAYER_V2_ENDPOINT, { id: playerId }),
      {
        skipCache: options?.fresh,
        ...(realmId != null ? { searchParams: { realmId: realmId.toString() } } : {}),
      }
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
  ) {
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
  public static async lookupActivePlayerCount() {
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
  }) {
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
  public static async lookupLeaderboard(leaderboardId: string | number) {
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
  public static async lookupLeaderboardByHash(hash: string, difficulty: number, gameMode: string) {
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
  ) {
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
  ) {
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
  public static async lookupLeaderboardRealmScores(leaderboardId: number, page: number, realmId: number) {
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
  public static async lookupRealms() {
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
  public static async lookupRealmPpCurve(realmId: number) {
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
  public static async lookupRankingRequests() {
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
  public static async refreshPlayer(id: string) {
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
   * @returns the leaderboards, and whether every one of them was fetched. A page that could not be
   *   fetched ends the walk early, so an incomplete list must never be used to conclude that a
   *   leaderboard is missing from ScoreSaber.
   */
  public static async getAllLeaderboards(
    status: "ranked" | "qualified",
    logProgress: boolean = false,
    realmId?: number
  ) {
    const leaderboards: ScoreSaberLeaderboard[] = [];
    let complete = true;
    let expectedTotal: number | undefined;
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
        complete = false;
        hasMorePages = false;
        continue;
      }

      expectedTotal ??= response.metadata.totalItems;
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

    if (expectedTotal === undefined || leaderboards.length < expectedTotal) {
      complete = false;
    }

    return { leaderboards, leaderboardDifficulties, complete };
  }

  private static log(message: string) {
    scoreSaberApiLog.debug(message);
  }

  public static getAverageLatencyMs() {
    if (ScoreSaberApiService.totalRequests <= 0) {
      return 0;
    }
    return ScoreSaberApiService.totalRequestLatencyMs / ScoreSaberApiService.totalRequests;
  }
}
