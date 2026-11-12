import { parse } from "devalue";
import { DetailType } from "../detail-type";
import { env } from "../env";
import { BackendUnavailableError } from "../error/backend-unavailable-error";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import type { AccSaberScoreSort, AccSaberScoreType } from "../schemas/accsaber/query/query";
import { BeatSaverMap } from "../schemas/beatsaver/map/map";
import { LeaderboardStarChange } from "../schemas/leaderboard/leaderboard-star-change";
import { MapCharacteristic } from "../schemas/map/map-characteristic";
import { MapDifficulty } from "../schemas/map/map-difficulty";
import { ScoreStatsResponse } from "../schemas/response/beatleader/score-stats";
import { LeaderboardResponse } from "../schemas/response/leaderboard/leaderboard";
import { LeaderboardScoresResponse } from "../schemas/response/leaderboard/leaderboard-scores";
import { LeaderboardsPageResponse } from "../schemas/response/leaderboard/leaderboards-page";
import { PlaysByHmdResponse } from "../schemas/response/leaderboard/plays-by-hmd";
import { RankingQueueLeaderboardsResponse } from "../schemas/response/leaderboard/ranking-queue-leaderboards";
import { MiniRankingResponse } from "../schemas/response/player/around-player";
import { PlayerPpsResponse } from "../schemas/response/player/player-pps";
import { PlayerRankingsResponse } from "../schemas/response/player/player-rankings";
import { PlayerSearchResponse } from "../schemas/response/player/player-search";
import { PlayerScoresChartResponse } from "../schemas/response/player/scores-chart";
import { PlayerMedalRankingsResponse } from "../schemas/response/ranking/medal-rankings";
import { RealmPpCurveResponse } from "../schemas/response/realm/realm-pp-curve";
import { RealmsResponse } from "../schemas/response/realm/realms";
import { AccSaberScoresPageResponse } from "../schemas/response/score/accsaber-scores-page";
import { PlayerScoresPageResponse } from "../schemas/response/score/player-scores";
import { ScoreHistoryGraph } from "../schemas/response/score/score-history-graph";
import { ScoreSaberScoresPageResponse } from "../schemas/response/score/scoresaber-scores-page";
import { TopScoresPageResponse } from "../schemas/response/score/top-scores";
import { AppStatisticsResponse } from "../schemas/response/ssr/app-statistics";
import { StatisticsResponse } from "../schemas/response/ssr/platform-statistics";
import type {
  PlayerReweightScoresResponse,
  PlayerReweightsResponse,
  ReweightMarkersResponse,
  ReweightPlayersPageResponse,
  ReweightResponse,
  ReweightsPageResponse,
} from "../schemas/reweight/reweight-responses";
import type { PlayerScoresQuery } from "../schemas/score/query/player-scores-query";
import { ScoreSaberMedalScoreSortField } from "../schemas/score/query/sort/scoresaber-medal-scores-sort";
import type { ScoreSaberScoreSortField } from "../schemas/score/query/sort/scoresaber-scores-sort";
import type { SortDirection } from "../schemas/score/query/sort/sort-direction";
import { ScoreSaberLeaderboardQueryFilters } from "../schemas/scoresaber/leaderboard/query-filters";
import { ScoreSaberPlayerHistoryEntries } from "../schemas/scoresaber/player/history";
import { ScoreSaberScore } from "../schemas/scoresaber/score/score";
import { PlayerScore } from "../score/player-score";
import { ScoreSaberScoreSort } from "../score/score-sort";
import { getQueryParamsFromObject } from "./utils";

/**
 * Builds the query parameter that selects a realm. Omitted when no realm is given so the backend
 * falls back to the default realm.
 *
 * @param realmId the realm to select
 */
function realmParam(realmId?: number): Record<string, string> {
  return realmId === undefined ? {} : { realmId: realmId.toString() };
}

class SSRApi {
  /**
   * Retrieves a response from the API.
   *
   * @throws an error if the request fails
   */
  async request<T>(url: string, queryParams?: Record<string, string>, body?: Record<string, unknown>) {
    const queryString = getQueryParamsFromObject(queryParams || {});

    let response: Response;
    try {
      response = await fetch(`${env.NEXT_PUBLIC_API_URL}${url}${queryString}`, {
        method: body ? "POST" : "GET",
        headers: {
          Accept: "application/devalue",
          ...(body && { "Content-Type": "application/json" }),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      // Backend is offline/unreachable (connection refused, DNS, timeout, TLS, ...).
      throw new BackendUnavailableError(undefined, { cause: error });
    }

    const responseText = await response.text();

    // A genuine "not found" from the backend is a devalue-serialized error
    // object with a matching content type. A 404 served by a proxy/CDN when the
    // backend is offline is HTML or plain text — treat that as unavailable, not
    // as "not found".
    if (response.status === 404) {
      if (response.headers.get("content-type")?.includes("application/devalue")) {
        return undefined;
      }
      throw new BackendUnavailableError(undefined, { cause: response });
    }

    if (!response.ok) {
      // 5xx (including 502/503/504 from a gateway) means the backend is down
      // or failing — surface a friendly error instead of a generic message.
      if (response.status >= 500) {
        throw new BackendUnavailableError(
          `The backend is currently unavailable (HTTP ${response.status}). Please try again later.`
        );
      }
      throw new Error(`Request failed with status ${response.status}: ${responseText}`);
    }

    try {
      return parse(responseText) as T;
    } catch (error) {
      // Not a valid devalue response — the backend isn't serving our API.
      throw new BackendUnavailableError(undefined, { cause: error });
    }
  }

  /**
   * Checks if the API is healthy.
   */
  async health() {
    const response = await this.request<string>("/health");
    return response === "OK";
  }

  /**
   * Gets a BeatSaver map.
   */
  async getBeatSaverMap(hash: string, difficulty: MapDifficulty, characteristic: MapCharacteristic) {
    return await this.request<BeatSaverMap>(`/beatsaver/map/${hash}/${difficulty}/${characteristic}`);
  }

  /**
   * Fetches the leaderboard
   *
   * @param realmId the realm to resolve ranking state for
   */
  async fetchLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    realmId?: number
  ) {
    return await this.request<LeaderboardResponse>(
      `/leaderboard/by-hash/${hash}/${difficulty}/${characteristic}`,
      realmParam(realmId)
    );
  }

  /**
   * Fetches star rating change history for a leaderboard (by id).
   *
   * @param realmId the realm to get the history for
   */
  async getLeaderboardStarHistory(leaderboardId: number, realmId?: number) {
    return await this.request<LeaderboardStarChange[]>(
      `/leaderboard/by-id/${leaderboardId}/star-history`,
      realmParam(realmId)
    );
  }

  /**
   * Fetches a page of reweights, newest first.
   */
  async getReweights(page: number = 1) {
    return await this.request<ReweightsPageResponse>(`/reweights`, { page: page.toString() });
  }

  /**
   * Fetches the minimal list of reweights used to annotate charts.
   */
  async getReweightMarkers() {
    return await this.request<ReweightMarkersResponse>(`/reweights/markers`);
  }

  /**
   * Fetches a reweight and the leaderboards it re-rated.
   */
  async getReweight(reweightId: number) {
    return await this.request<ReweightResponse>(`/reweights/${reweightId}`);
  }

  /**
   * Fetches a page of the players a reweight affected the most.
   *
   * @param direction which end of the pp change to list first
   */
  async getReweightPlayers(reweightId: number, page: number = 1, direction: "gain" | "loss" = "gain") {
    return await this.request<ReweightPlayersPageResponse>(`/reweights/${reweightId}/players`, {
      page: page.toString(),
      direction,
    });
  }

  /**
   * Fetches the reweights that changed a player's pp.
   */
  async getPlayerReweights(playerId: string) {
    return await this.request<PlayerReweightsResponse>(`/reweights/player/${playerId}`);
  }

  /**
   * Fetches every score of a player that a reweight changed, the biggest pp gain first.
   */
  async getPlayerReweightScores(playerId: string, reweightId: number) {
    return await this.request<PlayerReweightScoresResponse>(
      `/reweights/player/${playerId}/${reweightId}/scores`
    );
  }

  /**
   * Fetches a ScoreSaber leaderboard using its id.
   *
   * @param realmId the realm to resolve ranking state for
   */
  async fetchLeaderboard(id: number, type: DetailType = "basic", realmId?: number) {
    return await this.request<LeaderboardResponse>(`/leaderboard/by-id/${id}`, {
      type: type,
      ...realmParam(realmId),
    });
  }

  /**
   * Gets statistics for ScoreSaber.
   */
  async getScoreSaberStatistics() {
    return await this.request<StatisticsResponse>(`/statistics/scoresaber`);
  }

  /**
   * Gets all of the realms.
   */
  async getRealms() {
    return await this.request<RealmsResponse>(`/realms`);
  }

  /**
   * Gets the pp curve of a realm.
   *
   * @param realmId the ID of the realm
   */
  async getRealmPpCurve(realmId: number) {
    return await this.request<RealmPpCurveResponse>(`/realms/${realmId}/pp-curve`);
  }

  /**
   * Gets the app statistics.
   */
  async getAppStatistics() {
    return await this.request<AppStatisticsResponse>(`/statistics`);
  }

  /**
   * Gets the players around a player.
   *
   * @param realmId the realm to rank within
   */
  async getPlayerMiniRanking(playerId: string, realmId?: number) {
    return await this.request<MiniRankingResponse>(`/player/mini-ranking/${playerId}`, realmParam(realmId));
  }

  /**
   * Get the following scores for a leaderboard
   *
   * @param realmId the realm to resolve pp for
   */
  async getFollowingLeaderboardScores(
    followingIds: string[],
    leaderboardId: string,
    page: number,
    realmId?: number
  ) {
    return await this.request<ScoreSaberScoresPageResponse>(
      `/scores/following/leaderboard/${leaderboardId}/${page}`,
      realmParam(realmId),
      {
        followingIds: followingIds,
      }
    );
  }

  /**
   * Looks up a ScoreSaber player
   *
   * @param realmId the realm to resolve rank, pp and statistics for
   */
  async getScoreSaberPlayer(playerId: string, type: DetailType = "basic", realmId?: number) {
    return await this.request<ScoreSaberPlayer>(`/player/${playerId}`, {
      type: type,
      ...realmParam(realmId),
    });
  }

  /**
   * Gets the player's scores chart data.
   *
   * @param realmId the realm to resolve pp and stars for
   */
  async getPlayerScoresChart(playerId: string, realmId?: number) {
    return await this.request<PlayerScoresChartResponse>(
      `/player/scores-chart/${playerId}`,
      realmParam(realmId)
    );
  }

  /**
   * Fetches the player's scores history
   *
   * @param realmId the realm to show pp for
   */
  async fetchPlayerScoreSaberScoresHistory(
    playerId: string,
    leaderboardId: string,
    page: number,
    realmId?: number
  ) {
    return await this.request<ScoreSaberScoresPageResponse>(
      `/player/score-history/${playerId}/${leaderboardId}/${page}`,
      realmParam(realmId)
    );
  }

  /**
   * Fetches the score stats for a score.
   */
  async fetchScoreStats(scoreId: number) {
    return await this.request<ScoreStatsResponse>(`/beatleader/scorestats/${scoreId}`);
  }

  /**
   * Fetches the score history graph for a player and leaderboard.
   */
  async fetchScoreHistoryGraph(playerId: string, leaderboardId: number) {
    return await this.request<ScoreHistoryGraph>(`/scores/history-graph/${playerId}/${leaderboardId}`);
  }

  /**
   * Fetches the player's scores
   */
  async fetchScoreSaberPlayerScores(id: string, page: number, sort: ScoreSaberScoreSort, search?: string) {
    return await this.request<PlayerScoresPageResponse>(`/scores/player/scoresaber/${id}/${sort}/${page}`, {
      ...(search ? { search: search } : {}),
    });
  }

  /**
   * Fetches AccSaber player scores from the backend (REST + BeatLeader replay URLs).
   */
  async fetchAccSaberPlayerScores(
    id: string,
    page: number,
    sort: AccSaberScoreSort,
    direction: SortDirection,
    type: AccSaberScoreType
  ) {
    return await this.request<AccSaberScoresPageResponse>(`/scores/player/accsaber/${id}/${page}`, {
      sort,
      direction,
      type,
    });
  }

  /**
   * Fetches the player's ScoreSaber scores.
   */
  async fetchPlayerScoreSaberScores(
    id: string,
    page: number,
    sort: ScoreSaberScoreSortField,
    direction: SortDirection,
    filters: PlayerScoresQuery
  ) {
    const queryParams: Record<string, string> = {};
    if (filters.search) {
      queryParams.search = filters.search;
    }
    if (filters.hmd) {
      queryParams.hmd = filters.hmd;
    }
    if (filters.playerIds && filters.playerIds.length > 0) {
      queryParams.playerIds = filters.playerIds.join(",");
    }
    if (filters.realmId !== undefined) {
      queryParams.realmId = filters.realmId.toString();
    }
    return await this.request<PlayerScoresPageResponse>(
      `/scores/player/ssr/${id}/${sort}/${direction}/${page}`,
      queryParams
    );
  }

  /**
   * Fetches the player's ScoreSaber scores.
   */
  async fetchPlayerScoreSaberMedalScores(
    id: string,
    page: number,
    sort: ScoreSaberMedalScoreSortField,
    direction: SortDirection,
    filters: PlayerScoresQuery
  ) {
    const queryParams: Record<string, string> = {};
    if (filters.search) {
      queryParams.search = filters.search;
    }
    if (filters.hmd) {
      queryParams.hmd = filters.hmd;
    }
    if (filters.playerIds && filters.playerIds.length > 0) {
      queryParams.playerIds = filters.playerIds.join(",");
    }
    return await this.request<PlayerScoresPageResponse>(
      `/scores/player/medals/${id}/${sort}/${direction}/${page}`,
      queryParams
    );
  }

  /**
   * Fetches the player's scores
   *
   * @param realmId the realm to show pp for
   */
  async fetchLeaderboardScores(leaderboardId: string, page: number, country?: string, realmId?: number) {
    return await this.request<LeaderboardScoresResponse>(`/scores/leaderboard/${leaderboardId}/${page}`, {
      ...(country ? { country: country } : {}),
      ...realmParam(realmId),
    });
  }

  /**
   * Fetches the player's statistic history.
   *
   * @param realmId the realm to get the history for
   */
  async getPlayerStatisticHistory(playerId: string, count: number, realmId?: number) {
    return await this.request<ScoreSaberPlayerHistoryEntries>(`/player/history/${playerId}`, {
      count: count.toString(),
      ...realmParam(realmId),
    });
  }

  /**
   * Gets the pp values for a player's scores.
   *
   * @param realmId the realm to get pp values for
   */
  async getPlayerPps(playerId: string, realmId?: number) {
    return await this.request<PlayerPpsResponse>(`/player/pps/${playerId}`, realmParam(realmId));
  }

  /**
   * Gets the plays by HMD for a leaderboard
   */
  async getPlaysByHmdForLeaderboard(leaderboardId: string) {
    return await this.request<PlaysByHmdResponse>(`/leaderboard/play-count-by-hmd/${leaderboardId}`);
  }

  /**
   * Searches for players by name.
   */
  async searchPlayers(query: string) {
    return await this.request<PlayerSearchResponse>(`/player/search`, {
      query: query,
    });
  }

  /**
   * Searches for players by name.
   */
  async searchPlayersRanking(
    page: number,
    options?: {
      country?: string;
      search?: string;
      includeInactives?: boolean;
      realmId?: number;
    }
  ) {
    return await this.request<PlayerRankingsResponse>(`/ranking/${page}`, {
      ...realmParam(options?.realmId),
      ...(options?.country ? { country: options.country } : {}),
      ...(options?.search ? { search: options.search } : {}),
      ...(options?.includeInactives ? { includeInactives: options.includeInactives.toString() } : {}),
    });
  }

  /**
   * Gets the medal ranked players.
   */
  async getMedalRankedPlayers(page: number, country?: string) {
    return await this.request<PlayerMedalRankingsResponse>(`/ranking/medals/${page}`, {
      ...(country ? { country: country } : {}),
    });
  }

  /**
   * Gets a score by its ID.
   *
   * @param realmId the realm to resolve pp for
   */
  async getScore(scoreId: string, realmId?: number) {
    return await this.request<PlayerScore<ScoreSaberScore>>(`/scores/${scoreId}`, realmParam(realmId));
  }

  /**
   * Searches for leaderboards.
   *
   * @param realmId the realm to search ranking state in
   */
  async searchLeaderboards(page: number, options?: ScoreSaberLeaderboardQueryFilters, realmId?: number) {
    return await this.request<LeaderboardsPageResponse>(`/leaderboard/search`, {
      page: page.toString(),
      ...realmParam(realmId),
      ...(options?.ranked ? { ranked: options.ranked.toString() } : {}),
      ...(options?.qualified ? { qualified: options.qualified.toString() } : {}),
      ...(options?.category ? { category: options.category.toString() } : {}),
      ...(options?.minStars ? { minStars: options.minStars.toString() } : {}),
      ...(options?.maxStars ? { maxStars: options.maxStars.toString() } : {}),
      ...(options?.sort ? { sort: options.sort.toString() } : {}),
      ...(options?.query ? { query: options.query } : {}),
    });
  }

  /**
   * Fetches the ranking queue.
   */
  async fetchRankingQueue() {
    return await this.request<RankingQueueLeaderboardsResponse>(`/leaderboard/ranking-queue`);
  }

  /**
   * Fetches the top scores.
   *
   * @param realmId the realm to rank scores in
   */
  async fetchTopScores(page: number, realmId?: number) {
    return await this.request<TopScoresPageResponse>(`/scores/top/${page}`, realmParam(realmId));
  }
}

export const ssrApi = new SSRApi();
