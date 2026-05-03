import { parse } from "devalue";
import { DetailType } from "../detail-type";
import { env } from "../env";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import type { AccSaberScoreSort, AccSaberScoreType } from "../schemas/accsaber/tokens/query/query";
import { BeatSaverMap } from "../schemas/beatsaver/map/map";
import { LeaderboardStarChange } from "../schemas/leaderboard/leaderboard-star-change";
import { MapCharacteristic } from "../schemas/map/map-characteristic";
import { MapDifficulty } from "../schemas/map/map-difficulty";
import { ScoreStatsResponse } from "../schemas/response/beatleader/score-stats";
import { LeaderboardResponse } from "../schemas/response/leaderboard/leaderboard";
import LeaderboardScoresResponse from "../schemas/response/leaderboard/leaderboard-scores";
import { LeaderboardsPageResponse } from "../schemas/response/leaderboard/leaderboards-page";
import { PlaysByHmdResponse } from "../schemas/response/leaderboard/plays-by-hmd";
import { RankingQueueLeaderboardsResponse } from "../schemas/response/leaderboard/ranking-queue-leaderboards";
import { MiniRankingResponse } from "../schemas/response/player/around-player";
import { PlayerPpsResponse } from "../schemas/response/player/player-pps";
import { PlayerRankingsResponse } from "../schemas/response/player/player-rankings";
import { PlayerSearchResponse } from "../schemas/response/player/player-search";
import { PpGainResponse } from "../schemas/response/player/pp-boundary";
import { PlayerScoresChartResponse } from "../schemas/response/player/scores-chart";
import { PlayerMedalRankingsResponse } from "../schemas/response/ranking/medal-rankings";
import { AccSaberScoresPageResponse } from "../schemas/response/score/accsaber-scores-page";
import { PlayerScoresPageResponse } from "../schemas/response/score/player-scores";
import { ScoreHistoryGraph } from "../schemas/response/score/score-history-graph";
import { ScoreSaberScoresPageResponse } from "../schemas/response/score/scoresaber-scores-page";
import { TopScoresPageResponse } from "../schemas/response/score/top-scores";
import { StatisticsResponse } from "../schemas/response/ssr/platform-statistics";
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

class SSRApi {
  /**
   * Retrieves a response from the API.
   *
   * @param url the url to fetch
   * @param queryParams the query parameters for the request
   * @returns the parsed response
   * @throws an error if the request fails
   */
  async request<T>(url: string, queryParams?: Record<string, string>, body?: Record<string, unknown>) {
    const queryString = getQueryParamsFromObject(queryParams || {});
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${url}${queryString}`, {
      method: body ? "POST" : "GET",
      headers: {
        Accept: "application/devalue",
        ...(body && { "Content-Type": "application/json" }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseText = await response.text();

    if (response.status === 500) {
      throw new Error(`Failed to get ${url}${queryString}: ${response.statusText}`);
    }
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${responseText}`);
    }
    return parse(responseText) as T;
  }

  /**
   * Checks if the API is healthy.
   *
   * @returns true if the API is healthy, false otherwise
   */
  async health() {
    const response = await this.request<string>("/health");
    return response === "OK";
  }

  /**
   * Gets a BeatSaver map.
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   */
  async getBeatSaverMap(hash: string, difficulty: MapDifficulty, characteristic: MapCharacteristic) {
    return await this.request<BeatSaverMap>(`/beatsaver/map/${hash}/${difficulty}/${characteristic}`);
  }

  /**
   * Fetches the leaderboard
   *
   * @param hash the leaderboard hash
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   */
  async fetchLeaderboardByHash(hash: string, difficulty: MapDifficulty, characteristic: MapCharacteristic) {
    return await this.request<LeaderboardResponse>(
      `/leaderboard/by-hash/${hash}/${difficulty}/${characteristic}`
    );
  }

  /**
   * Fetches star rating change history for a leaderboard (by id).
   *
   * @param leaderboardId the ScoreSaber leaderboard id
   */
  async getLeaderboardStarHistory(leaderboardId: number) {
    return await this.request<LeaderboardStarChange[]>(`/leaderboard/by-id/${leaderboardId}/star-history`);
  }

  /**
   * Fetches a ScoreSaber leaderboard using its id.
   *
   * @param id the id for the leaderboard
   */
  async fetchLeaderboard(id: number, type: DetailType = "basic") {
    return await this.request<LeaderboardResponse>(`/leaderboard/by-id/${id}`, {
      type: type,
    });
  }

  /**
   * Gets statistics for ScoreSaber.
   *
   * @returns the statistics
   */
  async getScoreSaberStatistics() {
    return await this.request<StatisticsResponse>(`/statistics/scoresaber`);
  }

  /**
   * Gets the pp gain for a player.
   *
   * @param playerId the player's id
   * @param count the number of raw pp values to get
   */
  async getPlayerWeightedPpGainForRawPps(playerId: string, count: number = 1) {
    return await this.request<PpGainResponse>(`/player/pp-gain/${playerId}/${count}`);
  }

  /**
   * Gets the players around a player.
   *
   * @param playerId the player to get around
   */
  async getPlayerMiniRanking(playerId: string) {
    return await this.request<MiniRankingResponse>(`/player/mini-ranking/${playerId}`);
  }

  /**
   * Get the friend scores for a leaderboard
   *
   * @param friendIds the friends to lookup
   * @param leaderboardId the leaderboard to lookup
   * @param page the page
   */
  async getFriendLeaderboardScores(friendIds: string[], leaderboardId: string, page: number) {
    return await this.request<ScoreSaberScoresPageResponse>(
      `/scores/friend/leaderboard/${leaderboardId}/${page}`,
      undefined,
      {
        friendIds: friendIds,
      }
    );
  }

  /**
   * Looks up a ScoreSaber player
   *
   * @param playerId the player to lookup
   * @param options the fetch options
   * @returns the player
   */
  async getScoreSaberPlayer(playerId: string, type: DetailType = "basic") {
    return await this.request<ScoreSaberPlayer>(`/player/${playerId}`, {
      type: type,
    });
  }

  /**
   * Gets the player's scores chart data.
   *
   * @param playerId the player to get the score chart data for
   * @returns the score chart data
   */
  async getPlayerScoresChart(playerId: string) {
    return await this.request<PlayerScoresChartResponse>(`/player/scores-chart/${playerId}`);
  }

  /**
   * Fetches the player's scores history
   *
   * @param playerId the id of the player
   * @param leaderboardId the id of the leaderboard
   * @param page the page
   */
  async fetchPlayerScoreSaberScoresHistory(playerId: string, leaderboardId: string, page: number) {
    return await this.request<ScoreSaberScoresPageResponse>(
      `/player/score-history/${playerId}/${leaderboardId}/${page}`
    );
  }

  /**
   * Fetches the score stats for a score.
   *
   * @param scoreId the id of the score
   */
  async fetchScoreStats(scoreId: number) {
    return await this.request<ScoreStatsResponse>(`/beatleader/scorestats/${scoreId}`);
  }

  /**
   * Fetches the score history graph for a player and leaderboard.
   *
   * @param playerId the player's id to get the score history graph for
   * @param leaderboardId the leaderboard to get the score history graph for
   * @returns the score history graph
   */
  async fetchScoreHistoryGraph(playerId: string, leaderboardId: number) {
    return await this.request<ScoreHistoryGraph>(`/scores/history-graph/${playerId}/${leaderboardId}`);
  }

  /**
   * Fetches the player's scores
   *
   * @param id the player id
   * @param page the page
   * @param sort the sort
   * @param search the search
   * @returns the scores
   */
  async fetchScoreSaberPlayerScores(id: string, page: number, sort: ScoreSaberScoreSort, search?: string) {
    return await this.request<PlayerScoresPageResponse>(`/scores/player/scoresaber/${id}/${sort}/${page}`, {
      ...(search ? { search: search } : {}),
    });
  }

  /**
   * Fetches AccSaber player scores from the backend (GraphQL + BeatLeader replay URLs).
   *
   * @param id the player id
   * @param page the page
   * @param sort the sort
   * @param order the order
   * @param type the type
   * @returns the scores
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
   *
   * @param id the player id
   * @param page the page
   * @param sort the sort
   * @param direction the direction
   * @param filters the filters
   * @param search the search term
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
    return await this.request<PlayerScoresPageResponse>(
      `/scores/player/ssr/${id}/${sort}/${direction}/${page}`,
      queryParams
    );
  }

  /**
   * Fetches the player's ScoreSaber scores.
   *
   * @param id the player id
   * @param page the page
   * @param sort the sort
   * @param direction the direction
   * @param filters the filters
   * @param search the search term
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
   * @param leaderboardId the id of the leaderboard
   * @param page the page to lookup
   * @param country the country to get scores in
   */
  async fetchLeaderboardScores(leaderboardId: string, page: number, country?: string) {
    return await this.request<LeaderboardScoresResponse>(`/scores/leaderboard/${leaderboardId}/${page}`, {
      ...(country ? { country: country } : {}),
    });
  }

  /**
   * Fetches the player's statistic history.
   *
   * @param playerId the id of the player
   * @param count the number of days to get the statistic history for
   * @returns the statistic history
   */
  async getPlayerStatisticHistory(playerId: string, count: number) {
    return await this.request<ScoreSaberPlayerHistoryEntries>(`/player/history/${playerId}`, {
      count: count.toString(),
    });
  }

  /**
   * Gets the pp values for a player's scores.
   *
   * @param playerId the player id
   */
  async getPlayerPps(playerId: string) {
    return await this.request<PlayerPpsResponse>(`/player/pps/${playerId}`);
  }

  /**
   * Gets the plays by HMD for a leaderboard
   *
   * @param leaderboardId the leaderboard id
   * @returns the plays by HMD
   */
  async getPlaysByHmdForLeaderboard(leaderboardId: string) {
    return await this.request<PlaysByHmdResponse>(`/leaderboard/play-count-by-hmd/${leaderboardId}`);
  }

  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @returns the players that match the query
   */
  async searchPlayers(query: string) {
    return await this.request<PlayerSearchResponse>(`/player/search`, {
      query: query,
    });
  }

  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @param options the options for the search
   * @returns the players that match the query
   */
  async searchPlayersRanking(
    page: number,
    options?: {
      country?: string;
      search?: string;
    }
  ) {
    return await this.request<PlayerRankingsResponse>(`/ranking/${page}`, {
      ...(options?.country ? { country: options.country } : {}),
      ...(options?.search ? { search: options.search } : {}),
    });
  }

  /**
   * Gets the medal ranked players.
   *
   * @param page the page
   * @param country the country
   * @returns the medal ranked players
   */
  async getMedalRankedPlayers(page: number, country?: string) {
    return await this.request<PlayerMedalRankingsResponse>(`/ranking/medals/${page}`, {
      ...(country ? { country: country } : {}),
    });
  }

  /**
   * Gets a score by its ID.
   *
   * @param scoreId the id of the score
   * @returns the score
   */
  async getScore(scoreId: string) {
    return await this.request<PlayerScore<ScoreSaberScore>>(`/scores/${scoreId}`);
  }

  /**
   * Searches for leaderboards.
   *
   * @param page the page
   * @param options the options
   * @returns the leaderboards
   */
  async searchLeaderboards(page: number, options?: ScoreSaberLeaderboardQueryFilters) {
    return await this.request<LeaderboardsPageResponse>(`/leaderboard/search`, {
      page: page.toString(),
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
   *
   * @returns the ranking queue
   */
  async fetchRankingQueue() {
    return await this.request<RankingQueueLeaderboardsResponse>(`/leaderboard/ranking-queue`);
  }

  /**
   * Fetches the top scores.
   *
   * @param page the page
   * @returns the top scores
   */
  async fetchTopScores(page: number) {
    return await this.request<TopScoresPageResponse>(`/scores/top/${page}`);
  }
}

export const ssrApi = new SSRApi();
