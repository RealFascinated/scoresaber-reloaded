import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { BeatLeaderPlayersTotalSchema } from "@ssr/common/schemas/beatleader/tokens/players/page";
import {
  BeatLeaderPlayerLookupSchema,
  type BeatLeaderPlayerLookupToken,
} from "@ssr/common/schemas/beatleader/tokens/players/player";
import { ScoreStatsToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-stats";
import {
  BeatLeaderPlayerScoresPageSchema,
  type BeatLeaderPlayerScoresPageToken,
} from "@ssr/common/schemas/beatleader/tokens/score/page";
import { parseSchema } from "@ssr/common/schemas/parse";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { getQueryParamsFromObject } from "@ssr/common/utils/utils";
import { Value } from "typebox/value";
import { backoff, parseRetryAfterMs } from "./http-retry";

const LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT = "https://cdn.scorestats.beatleader.xyz/:scoreId.json";
const LOOKUP_PLAYERS_ENDPOINT =
  "https://api.beatleader.com/players?leaderboardContext=general&page=1&count=50&sortBy=pp&mapsType=ranked&ppType=general&order=desc";
const LOOKUP_PLAYER_ENDPOINT = "https://api.beatleader.com/player/:playerId";
const LOOKUP_PLAYER_SCORES_ENDPOINT = "https://api.beatleader.com/player/:playerId/scores";
const beatLeaderApiLog = Logger.withTopic("BeatLeader API");

/**
 * A player scores page request: the HTTP status BeatLeader answered with, plus the
 * parsed page when the response was a 200 this app could validate.
 */
export type BeatLeaderPlayerScoresPageResult = {
  status: number;
  page: BeatLeaderPlayerScoresPageToken | undefined;
};

export class BeatLeaderApiService {
  public static totalRequests: number = 0;
  public static failedRequests: number = 0;
  private static totalRequestLatencyMs: number = 0;

  /** Max concurrent in-flight BeatLeader API requests (global cap). */
  private static readonly MAX_CONCURRENT_REQUESTS = 4;
  private static activeRequests = 0;
  private static readonly requestQueue: (() => void)[] = [];

  /** Max attempts per logical request (including the first). */
  private static readonly MAX_ATTEMPTS = 5;
  /** Per-request timeout (ms). */
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

  private static async acquireRequestSlot(): Promise<void> {
    if (BeatLeaderApiService.activeRequests < BeatLeaderApiService.MAX_CONCURRENT_REQUESTS) {
      BeatLeaderApiService.activeRequests++;
      return;
    }
    await new Promise<void>(resolve => BeatLeaderApiService.requestQueue.push(resolve));
  }

  private static releaseRequestSlot(): void {
    const next = BeatLeaderApiService.requestQueue.shift();
    if (next) {
      next(); // pass the slot on to the next waiter
    } else {
      BeatLeaderApiService.activeRequests--;
    }
  }

  /**
   * Executes a BeatLeader API request with retries and returns the response
   * status and parsed JSON.
   *
   * Transient failures (network error, timeout, JSON parse failure, 429, 5xx)
   * are retried up to {@link MAX_ATTEMPTS} times with exponential backoff,
   * honoring `Retry-After` when present; a definitive 404 (or any other 4xx)
   * is returned immediately. Returns `undefined` only when every attempt
   * failed on transport. All requests share a global concurrency cap so the
   * seed queue and real-time paths cannot exceed the BeatLeader API budget.
   */
  private static async request(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
      useProxy?: boolean;
    }
  ): Promise<{ status: number; data: unknown } | undefined> {
    await BeatLeaderApiService.acquireRequestSlot();
    try {
      BeatLeaderApiService.totalRequests++;

      for (let attempt = 1; attempt <= BeatLeaderApiService.MAX_ATTEMPTS; attempt++) {
        const result = await BeatLeaderApiService.requestOnce(url, options);

        if (result == undefined) {
          // Transport failure — retry unless we exhausted the attempts.
          if (attempt < BeatLeaderApiService.MAX_ATTEMPTS) {
            await backoff(attempt);
            continue;
          }
          BeatLeaderApiService.failedRequests++;
          return undefined;
        }

        // 429 / 5xx are transient — retry (honoring Retry-After). Every other
        // status (2xx, 3xx, 4xx like 404) is a definitive answer.
        if ((result.status === 429 || result.status >= 500) && attempt < BeatLeaderApiService.MAX_ATTEMPTS) {
          await backoff(attempt, result.retryAfterMs);
          continue;
        }
        return result;
      }

      return undefined;
    } finally {
      BeatLeaderApiService.releaseRequestSlot();
    }
  }

  /**
   * Executes a single BeatLeader API request attempt.
   *
   * @returns the response status, parsed JSON and `Retry-After` delay, or
   *   `undefined` when the request failed before an HTTP response was received
   *   (network error, timeout, JSON parse failure)
   */
  private static async requestOnce(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
      useProxy?: boolean;
    }
  ): Promise<{ status: number; data: unknown; retryAfterMs?: number } | undefined> {
    const effectiveOptions = {
      useProxy: true,
      ...options,
    };
    const startedAt = performance.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BeatLeaderApiService.REQUEST_TIMEOUT_MS);

    const baseUrl = effectiveOptions.useProxy
      ? `${env.PROXY_URL}/${encodeURIComponent(`${url}${getQueryParamsFromObject(effectiveOptions.searchParams || {})}`)}`
      : `${url}${getQueryParamsFromObject(effectiveOptions.searchParams || {})}`;
    let response: Response | undefined;
    try {
      response = await fetch(baseUrl, {
        signal: controller.signal,
      });
    } catch {
      return undefined;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response) {
      return undefined;
    }

    // A non-JSON body is still a definitive HTTP status (e.g. an HTML 404
    // page from the CDN) — don't treat it as a transport failure and retry.
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }

    BeatLeaderApiService.totalRequestLatencyMs += Math.max(0, performance.now() - startedAt);
    return { status: response.status, data, retryAfterMs: parseRetryAfterMs(response) };
  }

  private static async fetch<T>(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
      useProxy?: boolean;
    }
  ): Promise<T | undefined> {
    const result = await BeatLeaderApiService.request(url, options);
    if (result == undefined) {
      return undefined;
    }
    if (result.status !== 200) {
      BeatLeaderApiService.failedRequests++;
      return undefined;
    }
    return result.data as T;
  }

  public static async lookupScoreStats(scoreId: number): Promise<ScoreStatsToken | undefined> {
    const before = performance.now();
    BeatLeaderApiService.log(`Looking up scorestats for "${scoreId}"...`);

    const response = await BeatLeaderApiService.fetch<ScoreStatsToken>(
      LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT.replace(":scoreId", scoreId.toString()),
      {
        useProxy: false,
      }
    );
    if (response == undefined) {
      return undefined;
    }

    BeatLeaderApiService.log(
      `Found scorestats for score "${scoreId}" in ${formatDuration(performance.now() - before)}`
    );
    return response;
  }

  public static async lookupPlayersTotal(): Promise<number | undefined> {
    const before = performance.now();
    BeatLeaderApiService.log("Looking up BeatLeader players total...");

    const response = await BeatLeaderApiService.fetch<unknown>(LOOKUP_PLAYERS_ENDPOINT);
    if (response == undefined) {
      return undefined;
    }

    if (!Value.Check(BeatLeaderPlayersTotalSchema, response)) {
      return undefined;
    }

    BeatLeaderApiService.log(
      `Found BeatLeader players total in ${formatDuration(performance.now() - before)}`
    );
    return parseSchema(BeatLeaderPlayersTotalSchema, response).metadata.total;
  }

  /**
   * Looks up a BeatLeader player by any of their known IDs (canonical BeatLeader ID,
   * Steam ID, Oculus PC ID, Quest ID, ...). Returns `undefined` when the player does
   * not exist on BeatLeader or the request fails.
   *
   * @param playerId the player ID to look up
   * @returns the player with their linked account IDs, or undefined
   */
  public static async lookupPlayer(playerId: string): Promise<BeatLeaderPlayerLookupToken | undefined> {
    const before = performance.now();
    BeatLeaderApiService.log(`Looking up BeatLeader player "${playerId}"...`);

    const response = await BeatLeaderApiService.fetch<unknown>(
      LOOKUP_PLAYER_ENDPOINT.replace(":playerId", playerId)
    );
    if (response == undefined) {
      return undefined;
    }

    if (!Value.Check(BeatLeaderPlayerLookupSchema, response)) {
      BeatLeaderApiService.log(
        `Failed to parse BeatLeader player "${playerId}": ${Value.Errors(BeatLeaderPlayerLookupSchema, response)[0]?.message}`
      );
      return undefined;
    }

    const parsed = parseSchema(BeatLeaderPlayerLookupSchema, response);
    BeatLeaderApiService.log(
      `Found BeatLeader player "${parsed.name}" in ${formatDuration(performance.now() - before)}`
    );
    return parsed;
  }

  /**
   * Fetches one page of a player's BeatLeader scores, keeping the HTTP status so the
   * caller can tell a page that does not exist (404: the player has no scores, or the
   * history ends here) from a failure worth retrying (429, 5xx, or a body this app
   * cannot validate). Collapsing both into `undefined` left players without BeatLeader
   * scores permanently unseeded, because "not found" could not be told apart from
   * "try again later".
   *
   * @param playerId the player ID to look up
   * @param page the page to fetch
   * @param options the query options
   * @returns the status with the parsed page when it parsed, or `undefined` when no
   *   HTTP response was received at all
   */
  public static async requestPlayerScoresPage(
    playerId: string,
    page: number,
    options?: {
      count?: number;
      sortBy?: "date";
      order?: "desc" | "asc";
      leaderboardContext?: "general";
      includeIO?: boolean;
      thenSortBy?: string;
      thenOrder?: string;
      noSearchSort?: boolean;
      search?: string;
      diff?: string;
      mode?: string;
      requirements?: string;
      type?: string;
      hmd?: string;
      modifiers?: string;
      stars_from?: string;
      stars_to?: string;
      eventId?: string;
    }
  ): Promise<BeatLeaderPlayerScoresPageResult | undefined> {
    const before = performance.now();
    BeatLeaderApiService.log(`Looking up BeatLeader scores page ${page} for "${playerId}"...`);

    const o = options ?? {};
    const result = await BeatLeaderApiService.request(
      LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":playerId", playerId),
      {
        searchParams: {
          leaderboardContext: o.leaderboardContext ?? "general",
          page: page.toString(),
          sortBy: o.sortBy ?? "date",
          order: o.order ?? "desc",
          thenSortBy: o.thenSortBy ?? "",
          thenOrder: o.thenOrder ?? "",
          noSearchSort: o.noSearchSort ? "true" : "false",
          search: o.search ?? "",
          diff: o.diff ?? "",
          mode: o.mode ?? "",
          requirements: o.requirements ?? "",
          type: o.type ?? "",
          hmd: o.hmd ?? "",
          modifiers: o.modifiers ?? "",
          stars_from: o.stars_from ?? "",
          stars_to: o.stars_to ?? "",
          eventId: o.eventId ?? "",
          count: (o.count ?? 100).toString(),
          includeIO: o.includeIO ? "true" : "false",
        },
      }
    );
    if (result == undefined) {
      return undefined;
    }

    if (result.status !== 200) {
      BeatLeaderApiService.failedRequests++;
      return { status: result.status, page: undefined };
    }

    if (!Value.Check(BeatLeaderPlayerScoresPageSchema, result.data)) {
      BeatLeaderApiService.log(
        `Failed to parse BeatLeader scores page ${page} for "${playerId}": ${Value.Errors(BeatLeaderPlayerScoresPageSchema, result.data)[0]?.message}`
      );
      return { status: result.status, page: undefined };
    }

    const parsed = parseSchema(BeatLeaderPlayerScoresPageSchema, result.data);
    BeatLeaderApiService.log(
      `Found BeatLeader scores page ${page} for "${playerId}" in ${formatDuration(performance.now() - before)}`
    );
    return { status: result.status, page: parsed };
  }

  private static log(message: string): void {
    beatLeaderApiLog.debug(message);
  }

  public static getAverageLatencyMs(): number {
    if (BeatLeaderApiService.totalRequests <= 0) {
      return 0;
    }
    return BeatLeaderApiService.totalRequestLatencyMs / BeatLeaderApiService.totalRequests;
  }
}
