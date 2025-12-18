import { parse } from "devalue";
import { PpGainResponse } from "src/schemas/response/player/pp-boundary";
import { DetailType } from "../detail-type";
import { env } from "../env";
import { StarFilter } from "../maps/types";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { StatisticsType } from "../model/statistics/statistic-type";
import type { Page } from "../pagination";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "../player/player-statistic-history";
import { ScoreStatsResponse } from "../schemas/beatleader/score-stats";
import { BeatSaverMapResponse } from "../schemas/response/beatsaver/beatsaver-map";
import { LeaderboardResponse } from "../schemas/response/leaderboard/leaderboard";
import LeaderboardScoresResponse from "../schemas/response/leaderboard/leaderboard-scores";
import { PlaysByHmdResponse } from "../schemas/response/leaderboard/plays-by-hmd";
import { MiniRankingResponse } from "../schemas/response/player/around-player";
import { PlayerPpsResponse } from "../schemas/response/player/player-pps";
import { PlayerRankingsResponse } from "../schemas/response/player/player-rankings";
import { PlayerSearchResponse } from "../schemas/response/player/player-search";
import { PlayerScoresChartResponse } from "../schemas/response/player/scores-chart";
import { PlayerMedalRankingsResponse } from "../schemas/response/ranking/medal-rankings";
import { PlayerScoresPageResponse } from "../schemas/response/score/player-scores";
import ScoreSaberRankingRequestsResponse from "../schemas/response/scoresaber/ranking-requests";
import { MapDifficulty } from "../score/map-difficulty";
import { PlayerScore } from "../score/player-score";
import { ScoreSaberScoreSort } from "../score/score-sort";
import { MapCharacteristic } from "../types/map-characteristic";
import { ScoreCalendarData } from "../types/player/player-statistic";
import { ScoreQuery, SortDirection, SortField } from "../types/score-query";
import ScoreSaberLeaderboardPageToken from "../types/token/scoresaber/leaderboard-page";
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
  async request<T>(url: string, queryParams?: Record<string, string>, body?: any) {
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
  async getBeatSaverMap(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    type: DetailType = "basic"
  ) {
    return await this.request<BeatSaverMapResponse>(
      `/beatsaver/map/${hash}/${difficulty}/${characteristic}`,
      {
        type: type,
      }
    );
  }

  /**
   * Fetches the leaderboard
   *
   * @param hash the leaderboard hash
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   */
  async fetchLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ) {
    return await this.request<LeaderboardResponse>(
      `/leaderboard/by-hash/${hash}/${difficulty}/${characteristic}`
    );
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
  async getScoreSaberPlatformStatistics() {
    return await this.request<{ statistics: StatisticsType }>(`/statistics/scoresaber`);
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
   * Gets the score calendar for a player.
   *
   * @param playerId the player's id
   * @param year the year to get the score calendar for
   * @param month the month to get the score calendar for
   */
  async getScoreCalendar(playerId: string, year: number, month: number) {
    return await this.request<ScoreCalendarData>(
      `/player/history/calendar/${playerId}/${year}/${month}`
    );
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
    return await this.request<Page<ScoreSaberScore>>(
      `/scores/friend/leaderboard/${leaderboardId}/${page}`,
      undefined,
      {
        friendIds: friendIds,
      }
    );
  }

  /**
   * Get the scores for a list of friends
   *
   * @param friendIds the friends to lookup
   * @param page the page
   */
  async getFriendScores(friendIds: string[], page: number) {
    return await this.request<Page<PlayerScore>>(`/scores/friend/${page}`, undefined, {
      friendIds: friendIds,
    });
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
  async fetchPlayerScoresHistory(playerId: string, leaderboardId: string, page: number) {
    return await this.request<Page<ScoreSaberScore>>(
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
   * Fetches the player's scores
   *
   * @param id the player id
   * @param page the page
   * @param sort the sort
   * @param search the search
   * @param comparisonPlayerId the player to compare scores with
   */
  async fetchScoreSaberPlayerScores(
    id: string,
    page: number,
    sort: ScoreSaberScoreSort,
    search?: string,
    comparisonPlayerId?: string
  ) {
    return await this.request<PlayerScoresPageResponse>(
      `/scores/player/scoresaber/${id}/${page}/${sort}`,
      {
        ...(search ? { search: search } : {}),
        ...(comparisonPlayerId ? { comparisonPlayerId: comparisonPlayerId } : {}),
      }
    );
  }

  /**
   * Fetches the player's scores from the cache.
   *
   * @param id the player id
   * @param page the page
   * @param sort the sort
   * @param search the search term
   */
  async fetchPlayerScores(
    id: string,
    mode: "ssr" | "medals",
    page: number,
    sort: SortField,
    direction: SortDirection,
    filters: ScoreQuery
  ) {
    return await this.request<PlayerScoresPageResponse>(
      `/scores/player/${mode}/${id}/${sort}/${direction}/${page}`,
      filters
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
    return await this.request<LeaderboardScoresResponse>(
      `/scores/leaderboard/${leaderboardId}/${page}`,
      {
        ...(country ? { country: country } : {}),
      }
    );
  }

  /**
   * Fetches the player's statistic history.
   *
   * @param playerId the id of the player
   * @param startDate the start date
   * @param endDate the end date
   * @param includedFields the fields to include in the response
   */
  async getPlayerStatisticHistory(
    playerId: string,
    startDate: Date,
    endDate: Date,
    includedFields?: (keyof PlayerStatisticHistory)[]
  ) {
    return await this.request<PlayerStatisticHistory>(`/player/history/${playerId}`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ...(includedFields ? { includedFields: includedFields.join(",") } : {}),
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
    return await this.request<PlaysByHmdResponse>(
      `/leaderboard/play-count-by-hmd/${leaderboardId}`
    );
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
    return await this.request<PlayerScore>(`/scores/${scoreId}`);
  }

  /**
   * Searches for leaderboards.
   *
   * @param page the page
   * @param options the options
   * @returns the leaderboards
   */
  async searchLeaderboards(
    page: number,
    options?: {
      ranked?: boolean;
      qualified?: boolean;
      verified?: boolean;
      category?: number;
      stars?: StarFilter;
      sort?: number;
      search?: string;
    }
  ) {
    return await this.request<ScoreSaberLeaderboardPageToken>(`/leaderboard/search`, {
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
    });
  }

  /**
   * Fetches the ranking queue.
   *
   * @returns the ranking queue
   */
  async fetchRankingQueue() {
    return await this.request<ScoreSaberRankingRequestsResponse>(`/leaderboard/ranking-queue`);
  }
}

export const ssrApi = new SSRApi();
