import Logger from "@ssr/common/logger";
import { BeatLeaderPlayersTotalSchema } from "@ssr/common/schemas/beatleader/tokens/players/page";
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
const LOOKUP_PLAYER_SCORES_ENDPOINT = "https://api.beatleader.com/player/:playerId/scores";
const beatLeaderApiLog = Logger.withTopic("BeatLeader API");

export class BeatLeaderApiService {
  public static totalRequests: number = 0;
  public static failedRequests: number = 0;
  private static totalRequestLatencyMs: number = 0;

  private static async fetch<T>(
    url: string,
    options?: {
      searchParams?: Record<string, string>;
      useProxy?: boolean;
    }
  ): Promise<T | undefined> {
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

    if (!response?.ok || response.status !== 200) {
      BeatLeaderApiService.failedRequests++;
      return undefined;
    }

    let data: T | undefined;
    try {
      data = (await response.json()) as T;
    } catch {
      BeatLeaderApiService.failedRequests++;
      return undefined;
    }

    BeatLeaderApiService.totalRequestLatencyMs += Math.max(0, performance.now() - startedAt);
    return data;
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
