import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { BeatLeaderLeaderboardsByHashSchema } from "@ssr/common/schemas/beatleader/tokens/leaderboards/leaderboards-by-hash";
import { BeatLeaderPlayersTotalSchema } from "@ssr/common/schemas/beatleader/tokens/players/page";
import { BeatLeaderPlayerLookupSchema } from "@ssr/common/schemas/beatleader/tokens/players/player";
import { ScoreStatsToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-stats";
import {
  BeatLeaderPlayerScoresPageSchema,
  type BeatLeaderPlayerScoresPageToken,
} from "@ssr/common/schemas/beatleader/tokens/score/page";
import { checkSchema, parseCheckedSchema, parseSchema } from "@ssr/common/schemas/parse";
import {
  type RequestFailure,
  type RequestResult,
  requestFailure,
  requestFailureFromStatus,
} from "@ssr/common/utils/request-result";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { getQueryParamsFromObject } from "@ssr/common/utils/utils";
import { Value } from "typebox/value";
import { backoff, parseRetryAfterMs } from "./http-retry";

const LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT = "https://cdn.scorestats.beatleader.com/:scoreId.json";
const LOOKUP_PLAYERS_ENDPOINT =
  "https://api.beatleader.com/players?leaderboardContext=general&page=1&count=50&sortBy=pp&mapsType=ranked&ppType=general&order=desc";
const LOOKUP_PLAYER_ENDPOINT = "https://api.beatleader.com/player/:playerId";
const LOOKUP_LEADERBOARDS_BY_HASH_ENDPOINT = "https://api.beatleader.com/leaderboards/hash/:hash";
const LOOKUP_PLAYER_SCORES_ENDPOINT = "https://api.beatleader.com/player/:playerId/scores";
const beatLeaderApiLog = Logger.withTopic("BeatLeader API");

export class BeatLeaderApiService {
  public static totalRequests: number = 0;
  public static failedRequests: number = 0;
  private static totalRequestLatencyMs: number = 0;

  private static readonly MAX_CONCURRENT_REQUESTS = 4;
  private static activeRequests = 0;
  private static readonly requestQueue: (() => void)[] = [];

  private static readonly MAX_ATTEMPTS = 5;
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

  private static async acquireRequestSlot() {
    if (BeatLeaderApiService.activeRequests < BeatLeaderApiService.MAX_CONCURRENT_REQUESTS) {
      BeatLeaderApiService.activeRequests++;
      return;
    }
    await new Promise<void>(resolve => BeatLeaderApiService.requestQueue.push(resolve));
  }

  private static releaseRequestSlot() {
    const next = BeatLeaderApiService.requestQueue.shift();
    if (next) {
      next();
    } else {
      BeatLeaderApiService.activeRequests--;
    }
  }

  private static async request(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
      useProxy?: boolean;
    }
  ) {
    await BeatLeaderApiService.acquireRequestSlot();
    try {
      BeatLeaderApiService.totalRequests++;

      let failure: RequestFailure = requestFailure(
        "unreachable",
        undefined,
        "BeatLeader request was never attempted"
      );
      for (let attempt = 1; attempt <= BeatLeaderApiService.MAX_ATTEMPTS; attempt++) {
        const result = await BeatLeaderApiService.requestOnce(url, options);
        const canRetry = attempt < BeatLeaderApiService.MAX_ATTEMPTS;

        if (result == undefined) {
          failure = requestFailure("unreachable", undefined, "BeatLeader request timed out or failed");
          if (canRetry) {
            await backoff(attempt);
            continue;
          }
          break;
        }

        if (result.status === 200) {
          if (result.data === undefined) {
            failure = requestFailure(
              "invalid_response",
              result.status,
              "BeatLeader returned a non-JSON body"
            );
            break;
          }
          return { ok: true, status: result.status, response: result.data } satisfies RequestResult<unknown>;
        }

        failure = requestFailureFromStatus(result.status, "BeatLeader");
        if ((result.status === 429 || result.status >= 500) && canRetry) {
          await backoff(attempt, result.retryAfterMs);
          continue;
        }
        break;
      }

      BeatLeaderApiService.failedRequests++;
      return failure;
    } finally {
      BeatLeaderApiService.releaseRequestSlot();
    }
  }

  private static async requestOnce(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
      useProxy?: boolean;
    }
  ) {
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
  ) {
    return (await BeatLeaderApiService.request(url, options)) as RequestResult<T>;
  }

  public static async lookupScoreStats(scoreId: number) {
    const before = performance.now();
    BeatLeaderApiService.log(`Looking up scorestats for "${scoreId}"...`);

    const result = await BeatLeaderApiService.fetch<ScoreStatsToken>(
      LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT.replace(":scoreId", scoreId.toString()),
      {
        useProxy: false,
      }
    );
    if (result.ok) {
      BeatLeaderApiService.log(
        `Found scorestats for score "${scoreId}" in ${formatDuration(performance.now() - before)}`
      );
    }
    return result;
  }

  public static async lookupPlayersTotal() {
    const before = performance.now();
    BeatLeaderApiService.log("Looking up BeatLeader players total...");

    const result = await BeatLeaderApiService.fetch<unknown>(LOOKUP_PLAYERS_ENDPOINT);
    if (!result.ok) {
      return result;
    }

    if (!checkSchema(BeatLeaderPlayersTotalSchema, result.response)) {
      return requestFailure(
        "invalid_response",
        result.status,
        `BeatLeader players total did not match the expected schema: ${Value.Errors(BeatLeaderPlayersTotalSchema, result.response)[0]?.message}`
      );
    }

    BeatLeaderApiService.log(
      `Found BeatLeader players total in ${formatDuration(performance.now() - before)}`
    );
    return {
      ok: true,
      status: result.status,
      response: parseSchema(BeatLeaderPlayersTotalSchema, result.response).metadata.total,
    } satisfies RequestResult<number>;
  }

  /**
   * Looks up a BeatLeader player by any of their known IDs (canonical BeatLeader ID,
   * Steam ID, Oculus PC ID, Quest ID, ...).
   *
   * @param playerId the player ID to look up
   * @returns the player with their linked account IDs, or the failure (`not_found` when the
   *   player does not exist on BeatLeader)
   */
  public static async lookupPlayer(playerId: string) {
    const before = performance.now();
    BeatLeaderApiService.log(`Looking up BeatLeader player "${playerId}"...`);

    const result = await BeatLeaderApiService.fetch<unknown>(
      LOOKUP_PLAYER_ENDPOINT.replace(":playerId", playerId)
    );
    if (!result.ok) {
      return result;
    }

    if (!checkSchema(BeatLeaderPlayerLookupSchema, result.response)) {
      return requestFailure(
        "invalid_response",
        result.status,
        `Failed to parse BeatLeader player "${playerId}": ${Value.Errors(BeatLeaderPlayerLookupSchema, result.response)[0]?.message}`
      );
    }

    const parsed = parseSchema(BeatLeaderPlayerLookupSchema, result.response);
    BeatLeaderApiService.log(
      `Found BeatLeader player "${parsed.name}" in ${formatDuration(performance.now() - before)}`
    );
    return { ok: true, status: result.status, response: parsed } satisfies RequestResult<typeof parsed>;
  }

  /**
   * Looks up the leaderboards (one per difficulty) of a map by its hash.
   *
   * @param hash the hash of the map
   * @returns the leaderboards, or the failure (`not_found` when the map is unknown to BeatLeader)
   */
  public static async lookupLeaderboardsByHash(hash: string) {
    BeatLeaderApiService.log(`Looking up BeatLeader leaderboards for "${hash}"...`);

    const result = await BeatLeaderApiService.fetch<unknown>(
      LOOKUP_LEADERBOARDS_BY_HASH_ENDPOINT.replace(":hash", encodeURIComponent(hash))
    );
    if (!result.ok) {
      return result;
    }

    if (!checkSchema(BeatLeaderLeaderboardsByHashSchema, result.response)) {
      return requestFailure(
        "invalid_response",
        result.status,
        `Failed to parse BeatLeader leaderboards for "${hash}": ${Value.Errors(BeatLeaderLeaderboardsByHashSchema, result.response)[0]?.message}`
      );
    }
    const parsed = parseSchema(BeatLeaderLeaderboardsByHashSchema, result.response);
    return { ok: true, status: result.status, response: parsed } satisfies RequestResult<typeof parsed>;
  }

  /**
   * Fetches one page of a player's BeatLeader scores. A page that does not exist (`not_found`: the
   * player has no scores, or the history ends here) is told apart from a failure worth retrying
   * (`rate_limited`, `server_error`, `unreachable`, or an `invalid_response` this app cannot validate).
   *
   * @param playerId the player ID to look up
   * @param page the page to fetch
   * @param options the query options
   * @returns the parsed page, or the failure
   */
  public static async lookupPlayerScoresPage(
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
  ) {
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
    if (!result.ok) {
      return result;
    }

    if (!checkSchema(BeatLeaderPlayerScoresPageSchema, result.response)) {
      BeatLeaderApiService.failedRequests++;
      return requestFailure(
        "invalid_response",
        result.status,
        `Failed to parse BeatLeader scores page ${page} for "${playerId}": ${Value.Errors(BeatLeaderPlayerScoresPageSchema, result.response)[0]?.message}`
      );
    }

    const parsed = parseCheckedSchema(BeatLeaderPlayerScoresPageSchema, result.response);
    BeatLeaderApiService.log(
      `Found BeatLeader scores page ${page} for "${playerId}" in ${formatDuration(performance.now() - before)}`
    );
    return {
      ok: true,
      status: result.status,
      response: parsed,
    } satisfies RequestResult<BeatLeaderPlayerScoresPageToken>;
  }

  private static log(message: string) {
    beatLeaderApiLog.debug(message);
  }

  public static getAverageLatencyMs() {
    if (BeatLeaderApiService.totalRequests <= 0) {
      return 0;
    }
    return BeatLeaderApiService.totalRequestLatencyMs / BeatLeaderApiService.totalRequests;
  }
}
