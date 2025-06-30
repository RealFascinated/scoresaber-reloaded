import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import { DetailType } from "@ssr/common/detail-type";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import {
  ScoreSaberMedalsScore,
  ScoreSaberMedalsScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-medals-score";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Pagination } from "@ssr/common/pagination";
import { PlayerMedalScoresResponse } from "@ssr/common/response/player-medal-scores-response";
import { PlayerScoresChartResponse } from "@ssr/common/response/player-scores-chart";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { ScoreSort, validateSort } from "@ssr/common/types/sort";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { FilterQuery } from "mongoose";
import { scoreToObject } from "../../common/score/score.util";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { ScoreService } from "../score/score.service";
import ScoreSaberService from "../scoresaber.service";
import { PlayerService } from "./player.service";

type PlayerRefreshResult = {
  missingScores: number;
  updatedScores: number;
  totalScores: number;
  totalPages: number;
  timeTaken: number;
  partialRefresh: boolean;
};

export class PlayerScoresService {
  /**
   * Refreshes all scores for a player.
   *
   * @param player the player to refresh scores for
   * @param playerToken the player's token
   * @returns the result of the refresh
   */
  public static async refreshAllPlayerScores(
    player: Player,
    playerToken: ScoreSaberPlayerToken
  ): Promise<PlayerRefreshResult> {
    Logger.info(`Refreshing scores for ${player._id}...`);

    let playerScoresCount = await ScoreSaberScoreModel.countDocuments({
      playerId: player._id,
    });

    const startTime = performance.now();

    const result: PlayerRefreshResult = {
      missingScores: 0,
      updatedScores: 0,
      totalScores: 0,
      totalPages: 0,
      timeTaken: 0,
      partialRefresh: false,
    };

    // First, get the first page to determine total pages
    const firstPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayerScores({
        playerId: player._id,
        page: 1,
        limit: 100,
        sort: "recent",
        priority: CooldownPriority.BACKGROUND,
      });

    if (!firstPage) {
      Logger.info(`No scores found for player ${player._id}`);
      result.partialRefresh = true;
      result.totalScores = playerScoresCount;
      // If the player has seeded scores and we've found all scores, we can stop refreshing
    } else if (playerScoresCount >= firstPage.metadata.total && player.seededScores) {
      Logger.info(`Player ${player._id} has no new scores to refresh. Skipping...`);
      result.partialRefresh = true;
      result.totalScores = playerScoresCount;
    } else {
      const totalPages = Math.ceil(firstPage.metadata.total / 100);
      Logger.info(`Found ${totalPages} total pages for ${player._id}`);
      result.totalPages = totalPages;

      let processedScoresCount = 0;

      // Process the first page
      for (const score of firstPage.playerScores) {
        const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);

        const { tracked, updatedScore } = await ScoreService.trackScoreSaberScore(
          getScoreSaberScoreFromToken(score.score, leaderboard, player._id),
          leaderboard,
          playerToken,
          true,
          false
        );
        if (tracked) {
          result.missingScores++;
        } else if (updatedScore) {
          result.updatedScores++;
        }
        playerScoresCount++;
        processedScoresCount++;

        // If the player has seeded scores and we've found all scores, we can stop refreshing
        if (processedScoresCount >= firstPage.metadata.total && player.seededScores) {
          Logger.info(
            `Found ${result.missingScores}/${firstPage.metadata.total} missing scores for ${player._id}. All scores found, stopping refresh.`
          );
          result.partialRefresh = true;
          break;
        }
      }

      // Process remaining pages if needed
      if (processedScoresCount < firstPage.metadata.total) {
        for (let page = 2; page <= totalPages; page++) {
          Logger.info(`Processing page ${page} for ${player._id}...`);

          const scoresPage = await ApiServiceRegistry.getInstance()
            .getScoreSaberService()
            .lookupPlayerScores({
              playerId: player._id,
              page: page,
              limit: 100,
              sort: "recent",
              priority: CooldownPriority.BACKGROUND,
            });

          if (!scoresPage) {
            Logger.warn(`Failed to fetch scores for ${player._id} on page ${page}.`);
            continue;
          }

          for (const score of scoresPage.playerScores) {
            const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);
            const { tracked, updatedScore } = await ScoreService.trackScoreSaberScore(
              getScoreSaberScoreFromToken(score.score, leaderboard, player._id),
              leaderboard,
              playerToken,
              true,
              false
            );
            if (tracked) {
              result.missingScores++;
            } else if (updatedScore) {
              result.updatedScores++;
            }
            playerScoresCount++;
            processedScoresCount++;

            // If the player has seeded scores and we've found all scores, we can stop refreshing
            if (processedScoresCount >= firstPage.metadata.total && player.seededScores) {
              Logger.info(
                `Found ${result.missingScores}/${firstPage.metadata.total} missing scores for ${player._id}. All scores found, stopping refresh.`
              );
              result.partialRefresh = true;
              break;
            }
          }

          Logger.info(`Completed page ${page} for ${player._id}`);

          // If the player has seeded scores and we've found all scores, we can stop refreshing
          if (processedScoresCount >= firstPage.metadata.total && player.seededScores) {
            break;
          }
        }
      }
    }

    // Mark player as seeded
    if (!player.seededScores) {
      await PlayerModel.updateOne({ _id: player._id }, { $set: { seededScores: true } });
    }

    result.totalScores = playerScoresCount;
    result.timeTaken = performance.now() - startTime;

    if (!result.partialRefresh) {
      Logger.info(
        `Finished refreshing scores for ${player._id}, total pages refreshed: ${result.totalPages} in ${formatDuration(result.timeTaken)}`
      );
    }

    return result;
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player's id
   */
  public static async getPlayerScoreChart(playerId: string): Promise<PlayerScoresChartResponse> {
    const playerScores = await PlayerService.getPlayerScores(playerId, {
      includeLeaderboard: true,
      sort: {
        field: "pp",
        direction: "desc",
        filters: {
          rankedOnly: true,
        },
      },
      projection: {
        accuracy: 1,
        pp: 1,
        timestamp: 1,
      },
    });

    // Process data points in parallel using Promise.all
    const data = await Promise.all(
      playerScores.map(async playerScore => {
        const leaderboard = playerScore.leaderboard as ScoreSaberLeaderboard;
        const score = playerScore.score as ScoreSaberScore;

        return {
          accuracy: score.accuracy,
          stars: leaderboard.stars,
          pp: score.pp,
          timestamp: score.timestamp,
          leaderboardId: leaderboard.id + "",
          leaderboardName: leaderboard.fullName,
          leaderboardDifficulty: getDifficultyName(
            getDifficulty(leaderboard.difficulty.difficulty)
          ),
        };
      })
    );

    return {
      data,
    };
  }

  /**
   * Gets the player scores from the database.
   *
   * @param playerId the id of the player
   * @param options the fetch options
   */
  public static async getPlayerScores(
    playerId: string,
    options: {
      sort?: ScoreSort;
      limit?: number;
      includeLeaderboard?: boolean;
      includeBeatSaver?: boolean;
      insertScoreData?: boolean;
      projection?: { [field: string]: number };
    } = {
      sort: { field: "pp", direction: "desc" },
    }
  ): Promise<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[]> {
    // Validate sort options if provided
    if (options?.sort && !validateSort(options.sort)) {
      throw new BadRequestError("Invalid sort options");
    }

    const fieldsMapping: Record<ScoreSort["field"], string> = {
      pp: "pp",
      score: "score",
      misses: "misses",
      acc: "accuracy",
      maxcombo: "maxCombo",
      date: "timestamp",
    };

    const filters = options?.sort?.filters ?? {
      rankedOnly: false,
      unrankedOnly: false,
    };

    const query: FilterQuery<ScoreSaberScore> = {
      playerId: playerId,
      leaderboardId: { $exists: true, $ne: null },
    };

    // Add filter to exclude Infinity values for sort field
    if (options?.sort?.field && options.sort.field !== "date") {
      query[fieldsMapping[options.sort.field]] = { $ne: Infinity, $exists: true };
    }

    // Filter scores based on the filters (same approach as getScoreSaberCachedPlayerScores)
    if (filters.rankedOnly) {
      query.pp = { $gt: 0 };
    }
    if (filters.unrankedOnly) {
      query.pp = { $lte: 0 };
    }

    // Build the final projection - ensure all necessary fields are included
    let finalProjection = options?.projection || {};

    // When including leaderboard, we need leaderboardId
    if (options?.includeLeaderboard) {
      finalProjection = { ...finalProjection, leaderboardId: 1 };
    }

    // Ensure sort field is included in projection if specified
    if (options?.sort?.field && options.sort.field !== "date") {
      const sortField = fieldsMapping[options.sort.field];
      if (sortField && !finalProjection[sortField]) {
        finalProjection[sortField] = 1;
      }
    }

    const rawScores = (await ScoreSaberScoreModel.find(query)
      .sort({
        [fieldsMapping[options?.sort?.field || "pp"]]: options?.sort?.direction === "asc" ? 1 : -1,
      })
      .select(finalProjection)
      .limit(options?.limit || 0)
      .lean()) as unknown as ScoreSaberScore[];

    if (!rawScores?.length) {
      return [];
    }

    if (!options?.includeLeaderboard) {
      return rawScores.map(rawScore => ({
        score: scoreToObject(rawScore) as ScoreSaberScore,
        leaderboard: null as unknown as ScoreSaberLeaderboard,
      }));
    }

    // Optimized leaderboard processing - only fetch what we need
    const leaderboardResponses = await LeaderboardService.getLeaderboards(
      rawScores.map(score => score.leaderboardId + ""),
      {
        includeBeatSaver: options?.includeBeatSaver ?? false,
        cacheOnly: true,
      }
    );

    const leaderboardMap = new Map(
      leaderboardResponses.map(response => [response.leaderboard.id, response])
    );

    // Process scores without async operations unless absolutely necessary
    const processedScores = rawScores.map(rawScore => {
      const leaderboardResponse = leaderboardMap.get(rawScore.leaderboardId);
      if (!leaderboardResponse) {
        return null;
      }

      const { leaderboard, beatsaver } = leaderboardResponse;
      const score = scoreToObject(rawScore) as ScoreSaberScore;

      return {
        score: score,
        leaderboard: leaderboard,
        beatSaver: beatsaver,
      } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
    });

    return processedScores.filter(
      (score): score is PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> => score !== null
    );
  }

  /**
   * Looks up player scores.
   *
   * @param playerId the player id
   * @param pageNumber the page to get
   * @param sort the sort to get
   * @param search the search to get
   */
  public static async getScoreSaberLivePlayerScores(
    playerId: string,
    pageNumber: number,
    sort: string,
    search?: string,
    comparisonPlayerId?: string
  ): Promise<PlayerScoresResponse> {
    // Get the requested page directly
    const requestedPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayerScores({
        playerId,
        page: pageNumber,
        sort: sort as ScoreSaberScoreSort,
        search,
      });

    if (!requestedPage) {
      return Pagination.empty<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>();
    }

    const pagination = new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(requestedPage.metadata.itemsPerPage)
      .setTotalItems(requestedPage.metadata.total);

    // Start fetching comparison player and leaderboard IDs in parallel
    const [comparisonPlayer, leaderboardIds] = await Promise.all([
      comparisonPlayerId !== playerId && comparisonPlayerId !== undefined
        ? ScoreSaberService.getPlayer(comparisonPlayerId, DetailType.BASIC)
        : undefined,
      requestedPage.playerScores.map(score => score.leaderboard.id + ""),
    ]);

    return await pagination.getPage(pageNumber, async () => {
      // Fetch all leaderboards in parallel using getLeaderboards
      const leaderboardResponses = await LeaderboardService.getLeaderboards(leaderboardIds, {
        includeBeatSaver: true,
        beatSaverType: DetailType.FULL,
      });

      // Create a map for quick leaderboard lookup
      const leaderboardMap = new Map(
        leaderboardResponses.map(result => [result.leaderboard.id, result])
      );

      // Process all scores in parallel with a concurrency limit
      const scorePromises = requestedPage.playerScores.map(async playerScore => {
        const leaderboardResponse = leaderboardMap.get(playerScore.leaderboard.id);
        if (!leaderboardResponse) {
          return undefined;
        }

        const { leaderboard, beatsaver } = leaderboardResponse;
        let score = getScoreSaberScoreFromToken(playerScore.score, leaderboard, playerId);
        if (!score) {
          return undefined;
        }

        score = await ScoreService.insertScoreData(score, leaderboard, comparisonPlayer);
        return {
          score: score,
          leaderboard: leaderboard,
          beatSaver: beatsaver,
        } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
      });

      // Wait for all score processing to complete and filter out any undefined results
      return (await Promise.all(scorePromises)).filter(Boolean) as PlayerScore<
        ScoreSaberScore,
        ScoreSaberLeaderboard
      >[];
    });
  }

  /**
   * Gets the scores for a player.
   *
   * @param playerId the id of the player
   * @param page the page number
   * @param options the sort options
   * @returns the paginated scores
   */
  public static async getScoreSaberCachedPlayerScores(
    playerId: string,
    page: number,
    options: ScoreSort,
    search?: string
  ): Promise<PlayerScoresResponse> {
    const isValid = validateSort(options);
    if (!isValid) {
      throw new BadRequestError("Invalid sort options");
    }

    const fieldsMapping: Record<ScoreSort["field"], string> = {
      pp: "pp",
      score: "score",
      misses: "misses",
      acc: "accuracy",
      maxcombo: "maxCombo",
      date: "timestamp",
    };

    const filters = options.filters ?? {
      rankedOnly: false,
      unrankedOnly: false,
    };

    // If search is provided, get matching leaderboard IDs first
    let matchingLeaderboardIds: number[] = [];

    // Only search if the search term is at least 3 characters long
    if (search && search.length >= 3) {
      // Get leaderboard IDs that match the search
      const matchingLeaderboards = await ScoreSaberLeaderboardModel.find({
        $or: [
          { songName: { $regex: search, $options: "i" } },
          { songSubName: { $regex: search, $options: "i" } },
          { songAuthorName: { $regex: search, $options: "i" } },
          { levelAuthorName: { $regex: search, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      if (matchingLeaderboards.length === 0) {
        // No matching leaderboards, return empty result
        const pagination = new Pagination<
          PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>
        >().setItemsPerPage(8);
        pagination.setTotalItems(0);
        return pagination.getPage(1, async () => []);
      }

      matchingLeaderboardIds = matchingLeaderboards.map((lb: { _id: number }) => lb._id);
    }

    const totalScores = await ScoreSaberScoreModel.countDocuments({
      playerId: playerId,
      ...(matchingLeaderboardIds.length > 0
        ? { leaderboardId: { $in: matchingLeaderboardIds } }
        : {}),
      ...(filters.rankedOnly ? { pp: { $gt: 0 } } : {}),
      ...(filters.unrankedOnly ? { pp: { $lte: 0 } } : {}),
    });
    const pagination = new Pagination<
      PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>
    >().setItemsPerPage(8);
    pagination.setTotalItems(totalScores);

    return pagination.getPage(page, async ({ start, end }) => {
      // Build query to exclude Infinity values
      const query: FilterQuery<ScoreSaberScore> = {
        playerId: playerId,
        ...(matchingLeaderboardIds.length > 0
          ? { leaderboardId: { $in: matchingLeaderboardIds } }
          : {}),
      };

      // Add filter to exclude Infinity values for the sort field
      if (options.field && options.field !== "date") {
        query[fieldsMapping[options.field]] = { $ne: Infinity, $exists: true };
      }

      // Filter scores based on the filters
      if (filters.rankedOnly) {
        query.pp = { $gt: 0 };
      }
      if (filters.unrankedOnly) {
        query.pp = { $lte: 0 };
      }

      const rawScores = (await ScoreSaberScoreModel.find(query)
        .sort({ [fieldsMapping[options.field]]: options.direction === "asc" ? 1 : -1 })
        .skip(start)
        .limit(end - start)
        .lean()) as unknown as ScoreSaberScore[];

      // Get leaderboards for the scores we have
      const leaderboardResponses = await LeaderboardService.getLeaderboards(
        rawScores.map(score => score.leaderboardId + ""),
        {
          includeBeatSaver: true,
          cacheOnly: true,
        }
      );

      const leaderboardMapForScores = new Map(
        leaderboardResponses.map(response => [response.leaderboard.id, response])
      );

      // Process scores in parallel
      const processedScores = await Promise.all(
        rawScores.map(async rawScore => {
          const leaderboardResponse = leaderboardMapForScores.get(rawScore.leaderboardId);
          if (!leaderboardResponse) {
            return null;
          }

          const { leaderboard, beatsaver } = leaderboardResponse;
          const score = await ScoreService.insertScoreData(scoreToObject(rawScore), leaderboard);
          return {
            score: score,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
        })
      );

      return processedScores.filter(
        (score): score is PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> => score !== null
      );
    });
  }

  /**
   * Gets the medal scores for a player.
   *
   * @param playerId the player's id.
   * @param page the page number
   * @returns the medal scores.
   */
  public static async getPlayerMedalScores(
    playerId: string,
    page: number = 1
  ): Promise<PlayerMedalScoresResponse> {
    const totalScores = await ScoreSaberMedalsScoreModel.countDocuments({
      playerId,
    });
    if (totalScores === 0) {
      return Pagination.empty<PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard>>();
    }

    const pagination = new Pagination<PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(8)
      .setTotalItems(totalScores);

    return pagination.getPage(page, async ({ start, end }) => {
      const rawScores = (await ScoreSaberMedalsScoreModel.find({ playerId })
        .skip(start)
        .limit(end - start)
        .sort({ medals: -1, timestamp: -1 }) // Sort by medals and timestamp in descending order
        .lean()) as unknown as ScoreSaberMedalsScore[];

      // Get leaderboards for the scores we have
      const leaderboardResponses = await LeaderboardService.getLeaderboards(
        rawScores.map(score => score.leaderboardId + ""),
        {
          includeBeatSaver: true,
          cacheOnly: true,
        }
      );

      const leaderboardMapForScores = new Map(
        leaderboardResponses.map(response => [response.leaderboard.id, response])
      );

      // Process scores in parallel - return PlayerScore objects
      const processedScores = await Promise.all(
        rawScores.map(async rawScore => {
          const leaderboardResponse = leaderboardMapForScores.get(rawScore.leaderboardId);
          if (!leaderboardResponse) {
            return null;
          }
          const { leaderboard, beatsaver } = leaderboardResponse;

          const score = (await ScoreService.insertScoreData(
            scoreToObject(rawScore),
            leaderboard
          )) as unknown as ScoreSaberMedalsScore;
          return {
            score: score,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          } as PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard>;
        })
      );

      return processedScores.filter(
        (score): score is PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard> =>
          score !== null
      );
    });
  }
}
