import { Config } from "../config";
import { MapCharacteristic } from "../types/map-characteristic";
import { MapDifficulty } from "../score/map-difficulty";
import { kyFetchJson, kyFetchText, kyPostJson } from "./utils";
import { BeatSaverMapResponse } from "../response/beatsaver-map-response";
import SuperJSON from "superjson";
import { LeaderboardResponse } from "../response/leaderboard-response";
import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { GamePlatform } from "../model/statistics/game-platform";
import { StatisticsType } from "../model/statistics/statistic-type";
import { PpBoundaryResponse } from "../response/pp-boundary-response";
import { PlayedMapsCalendarResponse } from "../response/played-maps-calendar-response";
import { AroundPlayer } from "../types/around-player";
import { AroundPlayerResponse } from "../response/around-player-response";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { Page } from "../pagination";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import { PlayerScoresChartResponse } from "../response/player-scores-chart";
import { DetailType } from "../detail-type";
import { PlayerScore } from "src/score/player-score";
import { ScoreStatsResponse } from "../response/scorestats-response";
import PlayerScoresResponse from "../response/player-scores-response";
import { ScoreSort } from "../score/score-sort";
import LeaderboardScoresResponse from "../response/leaderboard-scores-response";
import { PlayerStatisticHistory } from "src/player/player-statistic-history";

class SSRApi {
  /**
   * Gets a BeatSaver map.
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   */
  async getBeatSaverMap(hash: string, difficulty: MapDifficulty, characteristic: MapCharacteristic) {
    const response = await kyFetchText(`${Config.apiUrl}/beatsaver/map/${hash}/${difficulty}/${characteristic}`);
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
  async fetchLeaderboardByHash(hash: string, difficulty?: MapDifficulty, characteristic?: MapCharacteristic) {
    const response = await kyFetchText(`${Config.apiUrl}/leaderboard/by-hash/${hash}/${difficulty}/${characteristic}`, {
      searchParams: {
        superJson: true,
      },
    });
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
    const response = await kyFetchText(`${Config.apiUrl}/leaderboard/by-id/${id}`, {
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
    return await kyFetchJson<{ statistics: StatisticsType }>(`${Config.apiUrl}/statistics/${platform}`);
  }

  /**
   * Gets the pp boundary for a player.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  async getPlayerPpBoundary(playerId: string, boundary: number = 1) {
    return await kyFetchJson<PpBoundaryResponse>(`${Config.apiUrl}/player/pp-boundary/${playerId}/${boundary}`);
  }

  /**
   * Gets the score calendar for a player.
   *
   * @param playerId the player's id
   * @param year the year to get the score calendar for
   * @param month the month to get the score calendar for
   */
  async getScoreCalendar(playerId: string, year: number, month: number) {
    return await kyFetchJson<PlayedMapsCalendarResponse>(
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
    return await kyFetchJson<AroundPlayerResponse>(`${Config.apiUrl}/player/around/${playerId}/${type}`);
  }

  /**
   * Ensure the player is being tracked.
   *
   * @param playerId the player id
   */
  async trackPlayer(playerId: string) {
    await kyPostJson(`${Config.apiUrl}/player/track/${playerId}`);
  }

  /**
   * Get the friend scores for a leaderboard
   *
   * @param friendIds the friends to lookup
   * @param leaderboardId the leaderboard to lookup
   * @param page the page
   */
  async getFriendScores(friendIds: string[], leaderboardId: string, page: number) {
    const response = await kyFetchText(`${Config.apiUrl}/scores/friends/${leaderboardId}/${page}`, {
      searchParams: {
        friendIds: friendIds.join(","),
        superJson: true,
      },
    });
    if (response === undefined) {
      return undefined;
    }
    return SuperJSON.parse<Page<ScoreSaberScore>>(response);
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
    const response = await kyFetchText(`${Config.apiUrl}/player/${playerId}`, {
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
    const response = await kyFetchText(`${Config.apiUrl}/player/score-chart/${playerId}`, {
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
    const response = await kyFetchText(`${Config.apiUrl}/scores/history/${playerId}/${leaderboardId}/${page}`, {
      searchParams: {
        superJson: true,
      },
    });
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
    return kyFetchJson<ScoreStatsResponse>(`${Config.apiUrl}/scores/scorestats/${scoreId}`);
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
    return kyFetchJson<PlayerScoresResponse<S, L>>(
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
    return kyFetchJson<LeaderboardScoresResponse<S, L>>(
      `${Config.apiUrl}/scores/leaderboard/${leaderboardId}/${page}`,
      {
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
    return kyFetchJson<PlayerStatisticHistory>(`${Config.apiUrl}/player/history/${playerId}`, {
      searchParams: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  }
}

export const ssrApi = new SSRApi();
