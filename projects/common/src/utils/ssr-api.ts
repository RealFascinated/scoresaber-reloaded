import { PlayerStatisticHistory } from "src/player/player-statistic-history";
import { PlayerSearchResponse } from "src/response/player-search-response";
import { PlaysByHmdResponse } from "src/response/plays-by-hmd-response";
import { PlayerScore } from "src/score/player-score";
import { ScoreCalendarData } from "src/types/player/player-statistic";
import SuperJSON from "superjson";
import { DetailType } from "../detail-type";
import { env } from "../env";
import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { StatisticsType } from "../model/statistics/statistic-type";
import { Page } from "../pagination";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import { MiniRankingResponse } from "../response/around-player-response";
import { BeatSaverMapResponse } from "../response/beatsaver-map-response";
import { LeaderboardResponse } from "../response/leaderboard-response";
import LeaderboardScoresResponse from "../response/leaderboard-scores-response";
import { PlayerRankedPpsResponse } from "../response/player-ranked-pps-response";
import { PlayerScoresChartResponse } from "../response/player-scores-chart";
import { PpBoundaryResponse } from "../response/pp-boundary-response";
import { ScoreStatsResponse } from "../response/scorestats-response";
import { MapDifficulty } from "../score/map-difficulty";
import { ScoreSaberScoreSort } from "../score/score-sort";
import { MiniRankingType } from "../types/around-player";
import { MapCharacteristic } from "../types/map-characteristic";
import Request from "./request";
import { updateScoreWeights } from "./scoresaber.util";

class SSRApi {
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
    const response = await Request.get<string>(
      `${env.NEXT_PUBLIC_API_URL}/beatsaver/map/${hash}/${difficulty}/${characteristic}`,
      {
        returns: "text",
        searchParams: {
          type: type,
          superJson: true,
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<BeatSaverMapResponse>(response);
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
    const response = await Request.get<string>(
      `${env.NEXT_PUBLIC_API_URL}/leaderboard/by-hash/${hash}/${difficulty}/${characteristic}`,
      {
        returns: "text",
        searchParams: {
          superJson: true,
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<LeaderboardResponse>(response);
  }

  /**
   * Fetches a ScoreSaber leaderboard using its id.
   *
   * @param id the id for the leaderboard
   */
  async fetchLeaderboard(id: string, type: DetailType = DetailType.BASIC) {
    const response = await Request.get<string>(
      `${env.NEXT_PUBLIC_API_URL}/leaderboard/by-id/${id}`,
      {
        returns: "text",
        searchParams: {
          type: type,
          superJson: true,
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<LeaderboardResponse>(response);
  }

  /**
   * Gets statistics for ScoreSaber.
   *
   * @returns the statistics
   */
  async getScoreSaberPlatformStatistics() {
    return await Request.get<{ statistics: StatisticsType }>(
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
    return await Request.get<PpBoundaryResponse>(
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
    return await Request.get<ScoreCalendarData>(
      `${env.NEXT_PUBLIC_API_URL}/player/history/calendar/${playerId}/${year}/${month}`
    );
  }

  /**
   * Gets the players around a player.
   *
   * @param playerId the player to get around
   * @param type the type to get
   */
  async getPlayerMiniRanking(playerId: string, type: MiniRankingType) {
    return await Request.get<MiniRankingResponse>(
      `${env.NEXT_PUBLIC_API_URL}/mini-ranking/${playerId}/${type}`
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
    const response = await Request.get<string>(
      `${env.NEXT_PUBLIC_API_URL}/friend/leaderboard-scores/${leaderboardId}/${page}`,
      {
        returns: "text",
        searchParams: {
          friendIds: friendIds.join(","),
          superJson: true,
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<Page<ScoreSaberScore>>(response);
  }

  /**
   * Get the scores for a list of friends
   *
   * @param friendIds the friends to lookup
   * @param page the page
   */
  async getFriendScores(friendIds: string[], page: number) {
    const response = await Request.get<string>(
      `${env.NEXT_PUBLIC_API_URL}/friend/recent-scores/${page}`,
      {
        returns: "text",
        searchParams: {
          friendIds: friendIds.join(","),
          superJson: true,
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }

    return SuperJSON.parse<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>(response);
  }

  /**
   * Looks up a ScoreSaber player
   *
   * @param playerId the player to lookup
   * @param options the fetch options
   * @returns the player
   */
  async getScoreSaberPlayer(
    playerId: string,
    options?: {
      createIfMissing?: boolean;
      type?: DetailType;
    }
  ) {
    const response = await Request.get<string>(`${env.NEXT_PUBLIC_API_URL}/player/${playerId}`, {
      returns: "text",
      searchParams: {
        superJson: true,
        ...(options?.createIfMissing ? { createIfMissing: options.createIfMissing } : {}),
        ...(options?.type ? { type: options.type } : {}),
      },
    });
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<ScoreSaberPlayer>(response);
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player to get the score chart data for
   * @returns the score chart data
   */
  async getPlayerScoreChartData(playerId: string) {
    const response = await Request.get<string>(
      `${env.NEXT_PUBLIC_API_URL}/player/score-chart/${playerId}`,
      {
        returns: "text",
        searchParams: {
          superJson: true,
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<PlayerScoresChartResponse>(response);
  }

  /**
   * Fetches the player's scores history
   *
   * @param playerId the id of the player
   * @param leaderboardId the id of the leaderboard
   * @param page the page
   */
  async fetchPlayerScoresHistory(playerId: string, leaderboardId: string, page: number) {
    const response = await Request.get<string>(
      `${env.NEXT_PUBLIC_API_URL}/scores/history/${playerId}/${leaderboardId}/${page}`,
      {
        returns: "text",
        searchParams: {
          superJson: true,
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>(response);
  }

  /**
   * Fetches the score stats for a score.
   *
   * @param scoreId the id of the score
   */
  async fetchScoreStats(scoreId: number) {
    return Request.get<ScoreStatsResponse>(
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
   */
  async fetchScoreSaberPlayerScores(
    id: string,
    page: number,
    sort: ScoreSaberScoreSort,
    search?: string,
    comparisonPlayerId?: string
  ) {
    return Request.get<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>(
      `${env.NEXT_PUBLIC_API_URL}/scores/player/${id}/${page}/${sort}`,
      {
        returns: "json",
        searchParams: {
          ...(search ? { search: search } : {}),
          ...(comparisonPlayerId ? { comparisonPlayerId: comparisonPlayerId } : {}),
        },
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
  async fetchLeaderboardScores<S, L>(leaderboardId: string, page: number, country?: string) {
    return Request.get<LeaderboardScoresResponse<S, L>>(
      `${env.NEXT_PUBLIC_API_URL}/scores/leaderboard/${leaderboardId}/${page}`,
      {
        returns: "json",
        searchParams: {
          ...(country ? { country: country } : {}),
        },
      }
    );
  }

  /**
   * Fetches the player's statistic history.
   *
   * @param playerId the id of the player
   * @param startDate the start date
   * @param endDate the end date
   */
  async getPlayerStatisticHistory(
    playerId: string,
    startDate: Date,
    endDate: Date,
    includedFields?: (keyof PlayerStatisticHistory)[]
  ) {
    return Request.get<PlayerStatisticHistory>(
      `${env.NEXT_PUBLIC_API_URL}/player/history/${playerId}`,
      {
        returns: "json",
        searchParams: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          ...(includedFields ? { includedFields: includedFields.join(",") } : {}),
        },
      }
    );
  }

  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player id
   */
  async getPlayerRankedPps(playerId: string) {
    const response = await Request.get<PlayerRankedPpsResponse>(
      `${env.NEXT_PUBLIC_API_URL}/player/ranked-pps/${playerId}`
    );
    if (response === undefined) {
      return undefined;
    }
    updateScoreWeights(response.scores);
    return response;
  }

  /**
   * Gets the plays by HMD for a leaderboard
   *
   * @param leaderboardId the leaderboard id
   * @returns the plays by HMD
   */
  async getPlaysByHmdForLeaderboard(leaderboardId: string) {
    return Request.get<PlaysByHmdResponse>(
      `${env.NEXT_PUBLIC_API_URL}/leaderboard/plays-by-hmd/${leaderboardId}`
    );
  }

  /**
   * Gets the score history graph for a player on a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   */
  async getScoreHistoryGraph(playerId: string, leaderboardId: string) {
    const response = await Request.get<string>(
      `${env.NEXT_PUBLIC_API_URL}/scores/history-graph/${playerId}/${leaderboardId}`,
      {
        returns: "text",
        searchParams: {
          superJson: true,
        },
      }
    );
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<ScoreHistoryGraphResponse>(response);
  }

  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @returns the players that match the query
   */
  async searchPlayers(query: string): Promise<PlayerSearchResponse | undefined> {
    const response = await Request.get<string>(`${env.NEXT_PUBLIC_API_URL}/player/search`, {
      returns: "text",
      searchParams: {
        superJson: true,
        query: query,
      },
    });
    if (response === undefined) {
      return undefined;
    }

    return SuperJSON.parse<PlayerSearchResponse>(response);
  }
}

export const ssrApi = new SSRApi();
