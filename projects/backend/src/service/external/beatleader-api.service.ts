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
import { formatDuration } from "@ssr/common/utils/time-utils";
import { getQueryParamsFromObject } from "@ssr/common/utils/utils";

const LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT = "https://cdn.scorestats.beatleader.xyz/:scoreId.json";
const LOOKUP_PLAYERS_ENDPOINT =
  "https://api.beatleader.com/players?leaderboardContext=general&page=1&count=50&sortBy=pp&mapsType=ranked&ppType=general&order=desc";
const LOOKUP_PLAYER_ENDPOINT = "https://api.beatleader.com/player/:playerId";
const LOOKUP_PLAYER_SCORES_ENDPOINT = "https://api.beatleader.com/player/:playerId/scores";
const beatLeaderApiLog = Logger.withTopic("BeatLeader API");

export class BeatLeaderApiService {
  public static totalRequests: number = 0;
  public static failedRequests: number = 0;
  private static totalRequestLatencyMs: number = 0;

  /**
   * Executes a BeatLeader API request and returns the response status and parsed
   * JSON. Returns `undefined` for transport failures (network error, 15s abort
   * timeout, JSON parse failure) which are counted as failed requests.
   */
  private static async request(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
      useProxy?: boolean;
    }
  ): Promise<{ status: number; data: unknown } | undefined> {
    options = {
      useProxy: true,
      ...options,
    };
    const startedAt = performance.now();
    BeatLeaderApiService.totalRequests++;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const baseUrl = options?.useProxy
      ? `https://p.fascinated.cc/${encodeURIComponent(`${url}${getQueryParamsFromObject(options?.searchParams || {})}`)}`
      : `${url}${getQueryParamsFromObject(options?.searchParams || {})}`;
    let response: Response | undefined;
    try {
      response = await fetch(baseUrl, {
        signal: controller.signal,
      });
    } catch {
      BeatLeaderApiService.failedRequests++;
      return undefined;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response) {
      BeatLeaderApiService.failedRequests++;
      return undefined;
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      BeatLeaderApiService.failedRequests++;
      return undefined;
    }

    BeatLeaderApiService.totalRequestLatencyMs += Math.max(0, performance.now() - startedAt);
    return { status: response.status, data };
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

    const parsed = BeatLeaderPlayersTotalSchema.safeParse(response, { reportInput: true });
    if (!parsed.success) {
      return undefined;
    }

    BeatLeaderApiService.log(
      `Found BeatLeader players total in ${formatDuration(performance.now() - before)}`
    );
    return parsed.data.metadata.total;
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

    const parsed = BeatLeaderPlayerLookupSchema.safeParse(response, { reportInput: true });
    if (!parsed.success) {
      BeatLeaderApiService.log(`Failed to parse BeatLeader player "${playerId}": ${parsed.error.message}`);
      return undefined;
    }

    BeatLeaderApiService.log(
      `Found BeatLeader player "${parsed.data.name}" in ${formatDuration(performance.now() - before)}`
    );
    return parsed.data;
  }

  /**
   * Whether a BeatLeader player exists, distinguishing a definitive "not found"
   * (404) from a failed request.
   *
   * @param playerId the player ID to check
   * @returns `true` when the player exists, `false` when the API reports 404,
   *   or `undefined` when the request failed (network error, timeout, 429/5xx,
   *   parse failure) and the answer is unknown
   */
  public static async playerExists(playerId: string): Promise<boolean | undefined> {
    const result = await BeatLeaderApiService.request(
      LOOKUP_PLAYER_ENDPOINT.replace(":playerId", playerId)
    );
    if (result == undefined) {
      return undefined;
    }
    if (result.status === 404) {
      return false;
    }
    if (result.status !== 200) {
      BeatLeaderApiService.failedRequests++;
      return undefined;
    }
    return true;
  }

  public static async lookupPlayerScores(
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
  ): Promise<BeatLeaderPlayerScoresPageToken | undefined> {
    const before = performance.now();
    BeatLeaderApiService.log(`Looking up BeatLeader scores page ${page} for "${playerId}"...`);

    const o = options ?? {};
    const response = await BeatLeaderApiService.fetch<unknown>(
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
    if (response == undefined) {
      return undefined;
    }

    const parsed = BeatLeaderPlayerScoresPageSchema.safeParse(response, { reportInput: true });
    if (!parsed.success) {
      BeatLeaderApiService.log(
        `Failed to parse BeatLeader scores page ${page} for "${playerId}": ${parsed.error.message}`
      );
      return undefined;
    }

    BeatLeaderApiService.log(
      `Found BeatLeader scores page ${page} for "${playerId}" in ${formatDuration(performance.now() - before)}`
    );
    return parsed.data;
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
