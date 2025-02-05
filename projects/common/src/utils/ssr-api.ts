import { PlayerStatisticHistory } from "src/player/player-statistic-history";
import { PlayerScore } from "src/score/player-score";
import SuperJSON from "superjson";
import { Config } from "../config";
import { DetailType } from "../detail-type";
import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { GamePlatform } from "../model/statistics/game-platform";
import { StatisticsType } from "../model/statistics/statistic-type";
import { Page } from "../pagination";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import { AroundPlayerResponse } from "../response/around-player-response";
import { BeatSaverMapResponse } from "../response/beatsaver-map-response";
import { LeaderboardResponse } from "../response/leaderboard-response";
import LeaderboardScoresResponse from "../response/leaderboard-scores-response";
import { PlayedMapsCalendarResponse } from "../response/played-maps-calendar-response";
import { PlayerScoresChartResponse } from "../response/player-scores-chart";
import PlayerScoresResponse from "../response/player-scores-response";
import { PpBoundaryResponse } from "../response/pp-boundary-response";
import { ScoreStatsResponse } from "../response/scorestats-response";
import { MapDifficulty } from "../score/map-difficulty";
import { ScoreSort } from "../score/score-sort";
import { AroundPlayer } from "../types/around-player";
import { MapCharacteristic } from "../types/map-characteristic";
import RequestManager from "./request";

class SSRApi {
  /**
   * Gets a BeatSaver map.
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   */
  async getBeatSaverMap(hash: string, difficulty: MapDifficulty, characteristic: MapCharacteristic) {
    const response = await RequestManager.get<string>(
      `${Config.apiUrl}/beatsaver/map/${hash}/${difficulty}/${characteristic}`
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
  async fetchLeaderboardByHash(hash: string, difficulty: MapDifficulty, characteristic: MapCharacteristic) {
    const response = await RequestManager.get<string>(
      `${Config.apiUrl}/leaderboard/by-hash/${hash}/${difficulty}/${characteristic}`,
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
    return SuperJSON.parse<LeaderboardResponse<ScoreSaberLeaderboard>>(response);
  }

  /**
   * Fetches a ScoreSaber leaderboard using its id.
   *
   * @param id the id for the leaderboard
   */
  async fetchLeaderboard(id: string, type: DetailType = DetailType.BASIC) {
    const response = await RequestManager.get<string>(`${Config.apiUrl}/leaderboard/by-id/${id}`, {
      returns: "text",
      searchParams: {
        type: type,
        superJson: true,
      },
    });
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<LeaderboardResponse<ScoreSaberLeaderboard>>(response);
  }

  /**
   * Gets statistics for a platform.
   *
   * @param platform the platform to get statistics for
   */
  async getPlatformStatistics(platform: GamePlatform) {
    return await RequestManager.get<{ statistics: StatisticsType }>(`${Config.apiUrl}/statistics/${platform}`);
  }

  /**
   * Gets the pp boundary for a player.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  async getPlayerPpBoundary(playerId: string, boundary: number = 1) {
    return await RequestManager.get<PpBoundaryResponse>(`${Config.apiUrl}/player/pp-boundary/${playerId}/${boundary}`);
  }

  /**
   * Gets the score calendar for a player.
   *
   * @param playerId the player's id
   * @param year the year to get the score calendar for
   * @param month the month to get the score calendar for
   */
  async getScoreCalendar(playerId: string, year: number, month: number) {
    return await RequestManager.get<PlayedMapsCalendarResponse>(
      `${Config.apiUrl}/player/history/calendar/${playerId}/${year}/${month}`
    );
  }

  /**
   * Gets the players around a player.
   *
   * @param playerId the player to get around
   * @param type the type to get
   */
  async getPlayersAroundPlayer(playerId: string, type: AroundPlayer) {
    return await RequestManager.get<AroundPlayerResponse>(`${Config.apiUrl}/player/around/${playerId}/${type}`);
  }

  /**
   * Ensure the player is being tracked.
   *
   * @param playerId the player id
   */
  async trackPlayer(playerId: string) {
    await RequestManager.post(`${Config.apiUrl}/player/track/${playerId}`);
  }

  /**
   * Get the friend scores for a leaderboard
   *
   * @param friendIds the friends to lookup
   * @param leaderboardId the leaderboard to lookup
   * @param page the page
   */
  async getFriendLeaderboardScores(friendIds: string[], leaderboardId: string, page: number) {
    const response = await RequestManager.get<string>(
      `${Config.apiUrl}/scores/friends/leaderboard/${leaderboardId}/${page}`,
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
    const response = await RequestManager.get<string>(`${Config.apiUrl}/scores/friends/recent/${page}`, {
      returns: "text",
      searchParams: {
        friendIds: friendIds.join(","),
        superJson: true,
      },
    });
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
    const response = await RequestManager.get<string>(`${Config.apiUrl}/player/${playerId}`, {
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
    const response = await RequestManager.get<string>(`${Config.apiUrl}/player/score-chart/${playerId}`, {
      returns: "text",
      searchParams: {
        superJson: true,
      },
    });
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
    const response = await RequestManager.get<string>(
      `${Config.apiUrl}/scores/history/${playerId}/${leaderboardId}/${page}`,
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
    return RequestManager.get<ScoreStatsResponse>(`${Config.apiUrl}/scores/scorestats/${scoreId}`);
  }

  /**
   * Fetches the player's scores
   *
   * @param id the player id
   * @param page the page
   * @param sort the sort
   * @param search the search
   */
  async fetchPlayerScores<S, L>(id: string, page: number, sort: ScoreSort, search?: string) {
    return RequestManager.get<PlayerScoresResponse<S, L>>(
      `${Config.apiUrl}/scores/player/${id}/${page}/${sort}${search ? `?search=${search}` : ""}`
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
    return RequestManager.get<LeaderboardScoresResponse<S, L>>(
      `${Config.apiUrl}/scores/leaderboard/${leaderboardId}/${page}`,
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
  async getPlayerStatisticHistory(playerId: string, startDate: Date, endDate: Date) {
    return RequestManager.get<PlayerStatisticHistory>(`${Config.apiUrl}/player/history/${playerId}`, {
      returns: "json",
      searchParams: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  }
}

export const ssrApi = new SSRApi();
