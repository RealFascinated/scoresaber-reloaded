import SuperJSON from "superjson";
import { DetailType } from "../detail-type";
import { env } from "../env";
import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { StatisticsType } from "../model/statistics/statistic-type";
import { Page } from "../pagination";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "../player/player-statistic-history";
import { MiniRankingResponse } from "../response/around-player-response";
import { BeatSaverMapResponse } from "../response/beatsaver-map-response";
import { LeaderboardResponse } from "../response/leaderboard-response";
import LeaderboardScoresResponse from "../response/leaderboard-scores-response";
import { PlayerMedalRankingsResponse } from "../response/player-medal-rankings-response";
import { PlayerMedalScoresResponse } from "../response/player-medal-scores-response";
import { PlayerRankedPpsResponse } from "../response/player-ranked-pps-response";
import { PlayerRankingsResponse } from "../response/player-rankings-response";
import { PlayerScoresChartResponse } from "../response/player-scores-chart";
import { PlayerScoresResponse } from "../response/player-scores-response";
import { PlayerSearchResponse } from "../response/player-search-response";
import { PlaysByHmdResponse } from "../response/plays-by-hmd-response";
import { PpBoundaryResponse } from "../response/pp-boundary-response";
import { ScoreStatsResponse } from "../response/scorestats-response";
import { MapDifficulty } from "../score/map-difficulty";
import { PlayerScore } from "../score/player-score";
import { ScoreSaberScoreSort } from "../score/score-sort";
import { MapCharacteristic } from "../types/map-characteristic";
import { ScoreCalendarData } from "../types/player/player-statistic";
import { ScoreSort } from "../types/sort";

class SSRApi {
  /**
   * Retrieves a response from the API.
   *
   * @param url the url to fetch
   * @param queryParams the query parameters for the request
   * @returns the parsed response
   * @throws an error if the request fails
   */
  async get<T>(url: string, queryParams?: Record<string, string>) {
    const queryString = new URLSearchParams({
      ...queryParams,
      superjson: "true",
    }).toString();
    const fullUrl = `${url}?${queryString}`;
    const response = await fetch(fullUrl);
    
    if (response.status === 500) {
      throw new Error(`Failed to get ${fullUrl}: ${response.statusText}`);
    }
    if (response.status === 404) {
      return undefined;
    }
    return SuperJSON.parse<T>(await response.text());
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
    type: DetailType = DetailType.BASIC
  ) {
    return await this.get<BeatSaverMapResponse>(
      `${env.NEXT_PUBLIC_API_URL}/beatsaver/map/${hash}/${difficulty}/${characteristic}`,
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
    return await this.get<LeaderboardResponse>(
      `${env.NEXT_PUBLIC_API_URL}/leaderboard/by-hash/${hash}/${difficulty}/${characteristic}`
    );
  }

  /**
   * Fetches a ScoreSaber leaderboard using its id.
   *
   * @param id the id for the leaderboard
   */
  async fetchLeaderboard(id: string, type: DetailType = DetailType.BASIC) {
    return await this.get<LeaderboardResponse>(
      `${env.NEXT_PUBLIC_API_URL}/leaderboard/by-id/${id}`
    );
  }

  /**
   * Gets statistics for ScoreSaber.
   *
   * @returns the statistics
   */
  async getScoreSaberPlatformStatistics() {
    return await this.get<{ statistics: StatisticsType }>(
      `${env.NEXT_PUBLIC_API_URL}/statistics/scoresaber`
    );
  }

  /**
   * Gets the pp boundary for a player.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  async getPlayerPpBoundary(playerId: string, boundary: number = 1) {
    return await this.get<PpBoundaryResponse>(
      `${env.NEXT_PUBLIC_API_URL}/player/pp-boundary/${playerId}/${boundary}`
    );
  }

  /**
   * Gets the score calendar for a player.
   *
   * @param playerId the player's id
   * @param year the year to get the score calendar for
   * @param month the month to get the score calendar for
   */
  async getScoreCalendar(playerId: string, year: number, month: number) {
    return await this.get<ScoreCalendarData>(
      `${env.NEXT_PUBLIC_API_URL}/player/history/calendar/${playerId}/${year}/${month}`
    );
  }

  /**
   * Gets the players around a player.
   *
   * @param playerId the player to get around
   */
  async getPlayerMiniRanking(playerId: string) {
    return await this.get<MiniRankingResponse>(
      `${env.NEXT_PUBLIC_API_URL}/player/mini-ranking/${playerId}`
    );
  }

  /**
   * Get the friend scores for a leaderboard
   *
   * @param friendIds the friends to lookup
   * @param leaderboardId the leaderboard to lookup
   * @param page the page
   */
  async getFriendLeaderboardScores(friendIds: string[], leaderboardId: string, page: number) {
    return await this.get<Page<ScoreSaberScore>>(
      `${env.NEXT_PUBLIC_API_URL}/scores/friends/leaderboard/${leaderboardId}/${page}`,
      {
        friendIds: friendIds.join(","),
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
    return await this.get<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>(
      `${env.NEXT_PUBLIC_API_URL}/scores/friends/${page}`,
      {
        friendIds: friendIds.join(","),
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
  async getScoreSaberPlayer(playerId: string, type: DetailType = DetailType.BASIC) {
    return await this.get<ScoreSaberPlayer>(`${env.NEXT_PUBLIC_API_URL}/player/${playerId}`, {
      type: type,
    });
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player to get the score chart data for
   * @returns the score chart data
   */
  async getPlayerMapsGraphData(playerId: string) {
    return await this.get<PlayerScoresChartResponse>(
      `${env.NEXT_PUBLIC_API_URL}/player/maps-graph/${playerId}`
    );
  }

  /**
   * Fetches the player's scores history
   *
   * @param playerId the id of the player
   * @param leaderboardId the id of the leaderboard
   * @param page the page
   */
  async fetchPlayerScoresHistory(playerId: string, leaderboardId: string, page: number) {
    return await this.get<Page<ScoreSaberScore>>(
      `${env.NEXT_PUBLIC_API_URL}/player/score-history/${playerId}/${leaderboardId}/${page}`
    );
  }

  /**
   * Fetches the score stats for a score.
   *
   * @param scoreId the id of the score
   */
  async fetchScoreStats(scoreId: number) {
    return await this.get<ScoreStatsResponse>(
      `${env.NEXT_PUBLIC_API_URL}/beatleader/scorestats/${scoreId}`
    );
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
    return await this.get<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>(
      `${env.NEXT_PUBLIC_API_URL}/scores/player/${id}/${page}/${sort}`,
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
  async fetchCachedScoreSaberPlayerScores(
    id: string,
    page: number,
    sort: ScoreSort,
    search?: string
  ) {
    return await this.get<PlayerScoresResponse>(
      `${env.NEXT_PUBLIC_API_URL}/scores/cached/player/${id}/${sort.field}/${sort.direction}/${page}`,
      {
        ...Object.fromEntries(
          Object.entries(sort.filters ?? {}).map(([key, value]) => [key, value])
        ),
        ...(search ? { search: search } : {}),
      }
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
    return await this.get<LeaderboardScoresResponse>(
      `${env.NEXT_PUBLIC_API_URL}/scores/leaderboard/${leaderboardId}/${page}`,
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
    return await this.get<PlayerStatisticHistory>(
      `${env.NEXT_PUBLIC_API_URL}/player/history/${playerId}`,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(includedFields ? { includedFields: includedFields.join(",") } : {}),
      }
    );
  }

  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player id
   */
  async getPlayerRankedPps(playerId: string) {
    return await this.get<PlayerRankedPpsResponse>(
      `${env.NEXT_PUBLIC_API_URL}/player/ranked-pps/${playerId}`
    );
  }

  /**
   * Gets the plays by HMD for a leaderboard
   *
   * @param leaderboardId the leaderboard id
   * @returns the plays by HMD
   */
  async getPlaysByHmdForLeaderboard(leaderboardId: string) {
    return await this.get<PlaysByHmdResponse>(
      `${env.NEXT_PUBLIC_API_URL}/leaderboard/plays-by-hmd/${leaderboardId}`
    );
  }

  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @returns the players that match the query
   */
  async searchPlayers(query: string) {
    return await this.get<PlayerSearchResponse>(`${env.NEXT_PUBLIC_API_URL}/player/search`, {
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
    return await this.get<PlayerRankingsResponse>(
      `${env.NEXT_PUBLIC_API_URL}/player/search/ranking`,
      {
        page: page.toString(),
        ...(options?.country ? { country: options.country } : {}),
        ...(options?.search ? { search: options.search } : {}),
      }
    );
  }

  /**
   * Gets the medal ranked players.
   *
   * @param page the page
   * @param country the country
   * @returns the medal ranked players
   */
  async getMedalRankedPlayers(page: number, country?: string) {
    return await this.get<PlayerMedalRankingsResponse>(
      `${env.NEXT_PUBLIC_API_URL}/ranking/medals/${page}`,
      {
        ...(country ? { country: country } : {}),
      }
    );
  }

  /**
   * Fetches the player's medal scores.
   *
   * @param playerId the player's id
   * @param page the page
   */
  async fetchPlayerMedalScores(playerId: string, page: number) {
    return await this.get<PlayerMedalScoresResponse>(
      `${env.NEXT_PUBLIC_API_URL}/scores/medals/player/${playerId}/${page}`
    );
  }

  /**
   * Gets a score by its ID.
   *
   * @param scoreId the id of the score
   * @returns the score
   */
  async getScore(scoreId: string) {
    return await this.get<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>(
      `${env.NEXT_PUBLIC_API_URL}/scores/${scoreId}`
    );
  }
}

export const ssrApi = new SSRApi();
