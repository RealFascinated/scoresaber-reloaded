import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { ScoreType } from "@ssr/common/model/score/score";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import { PlayerScore } from "@ssr/common/score/player-score";
import { Timeframe } from "@ssr/common/timeframe";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { Metadata } from "@ssr/common/types/metadata";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { NotFoundError } from "elysia";
import mongoose from "mongoose";
import { fetchWithCache } from "../../common/cache.util";
import { scoreToObject } from "../../common/score/score.util";
import BeatLeaderService from "../beatleader.service";
import CacheService, { ServiceCache } from "../cache.service";
import LeaderboardService from "../scoresaber/leaderboard.service";
import ScoreSaberService from "../scoresaber/scoresaber.service";
import { PreviousScoresService } from "./previous-scores.service";

export class ScoreService {
  /**
   * Gets scores for a leaderboard.
   *
   * @param leaderboardId the leaderboard id
   * @param page the page to get
   * @param country the country to get scores in
   * @returns the scores
   */
  public static async getLeaderboardScores(
    leaderboardId: string,
    page: number,
    country?: string
  ): Promise<LeaderboardScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.LeaderboardScores),
      `leaderboard-scores:${leaderboardId}-${page}-${country}`,
      async () => {
        const scores: ScoreType[] = [];
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        const leaderboardResponse = await LeaderboardService.getLeaderboard(leaderboardId);
        if (leaderboardResponse == undefined) {
          throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
        }
        const leaderboard = leaderboardResponse.leaderboard;
        const beatSaverMap = leaderboardResponse.beatsaver;

        const leaderboardScores =
          await ApiServiceRegistry.getScoreSaberService().lookupLeaderboardScores(
            leaderboardId,
            page,
            {
              country: country,
            }
          );
        if (leaderboardScores == undefined) {
          return;
        }

        for (const token of leaderboardScores.scores) {
          const score = getScoreSaberScoreFromToken(
            token,
            leaderboardResponse.leaderboard,
            token.leaderboardPlayerInfo.id
          );
          if (score == undefined) {
            continue;
          }

          const additionalData = await BeatLeaderService.getAdditionalScoreDataFromSong(
            score.playerId,
            leaderboard.songHash,
            `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
            score.score
          );
          if (additionalData !== undefined) {
            score.additionalData = additionalData;
          }

          scores.push(score);
        }

        metadata = new Metadata(
          Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
          leaderboardScores.metadata.total,
          leaderboardScores.metadata.page,
          leaderboardScores.metadata.itemsPerPage
        );

        return {
          scores: scores,
          leaderboard: leaderboard,
          beatSaver: beatSaverMap,
          metadata: metadata,
        };
      }
    );
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
      sort?: "pp" | "timestamp";
      limit?: number;
      ranked?: boolean;
      includeLeaderboard?: boolean;
      projection?: { [field: string]: number };
    } = {
      sort: "pp",
    }
  ): Promise<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[]> {
    // Build the aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      // Match stage based on playerId and optional ranked filter
      {
        $match: {
          playerId: playerId,
          ...(options?.ranked ? { pp: { $gt: 0 } } : {}),
        },
      },
    ];

    // Add projection if specified
    if (options?.projection) {
      pipeline.push({
        $project: {
          ...options.projection,
          _id: 0,
          leaderboardId: 1,
          playerId: 1,
        },
      });
    }

    // Add sort stage only if specified
    if (options?.sort) {
      pipeline.push({ $sort: { [`${options.sort}`]: -1 } });
    }

    // Add limit if specified
    if (options?.limit) {
      pipeline.push({ $limit: options.limit });
    }

    // Execute aggregation
    const rawScores = await ScoreSaberScoreModel.aggregate(pipeline);
    if (!rawScores?.length) {
      return [];
    }

    // If we don't need leaderboards, return early with minimal processing
    if (!options?.includeLeaderboard) {
      return rawScores.map(rawScore => ({
        score: scoreToObject(rawScore) as ScoreSaberScore,
        leaderboard: null as unknown as ScoreSaberLeaderboard, // Type assertion to satisfy the interface
      }));
    }

    // Get all leaderboard IDs at once
    const leaderboardIds = rawScores.map(score => score.leaderboardId + "");

    // Fetch all leaderboards in parallel
    const leaderboardPromises = leaderboardIds.map(id =>
      LeaderboardService.getLeaderboard(id, {
        cacheOnly: true,
        includeBeatSaver: false,
      })
    );

    const leaderboardResults = await Promise.all(leaderboardPromises);

    // Map scores with their leaderboards
    return rawScores.map((rawScore, index) => ({
      score: scoreToObject(rawScore) as ScoreSaberScore,
      leaderboard:
        leaderboardResults[index]?.leaderboard || (null as unknown as ScoreSaberLeaderboard),
    }));
  }

  /**
   * Checks if a ScoreSaber score already exists.
   *
   * @param playerId the id of the player
   * @param leaderboard the leaderboard
   * @param score the score to check
   */
  public static async scoreExists(
    playerId: string,
    leaderboard: ScoreSaberLeaderboard,
    score: ScoreSaberScore
  ) {
    return (
      (await ScoreSaberScoreModel.exists({
        playerId: playerId + "",
        leaderboardId: leaderboard.id,
        difficulty: leaderboard.difficulty.difficulty,
        characteristic: leaderboard.difficulty.characteristic,
        score: score.score,
      })) !== null
    );
  }

  /**
   * Tracks ScoreSaber score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard for the score
   * @param player the player for the score
   * @param log whether to log the score
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberPlayerToken,
    log: boolean = true
  ): Promise<{ score: ScoreSaberScore | undefined; tracked: boolean }> {
    const before = performance.now();

    // Skip saving the score if characteristic is missing
    if (!score.characteristic) {
      Logger.warn(
        `Skipping ScoreSaber score "${score.scoreId}" for "${player.name}"(${player.id}) due to missing characteristic: "${score.characteristic}"`
      );
      return { score: undefined, tracked: false };
    }

    if (await ScoreService.scoreExists(player.id, leaderboard, score)) {
      // Logger.info(
      //   `Score "${score.scoreId}" for "${player.name}"(${player.id}) already exists, skipping`
      // );
      return { score: undefined, tracked: false };
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete score.playerInfo;

    // Remove the old score and create a new previous score
    const previousScore = await ScoreSaberScoreModel.findOne({
      playerId: player.id,
      leaderboardId: leaderboard.id,
    });
    if (previousScore) {
      await ScoreSaberScoreModel.deleteOne({
        playerId: player.id,
        leaderboardId: leaderboard.id,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = previousScore.toObject();
      await ScoreSaberPreviousScoreModel.create(rest);

      if (log) {
        Logger.info(
          `Moved old score "${previousScore.scoreId}" to previous-scores for "${player.name}"(${player.id}) in ${(performance.now() - before).toFixed(0)}ms`
        );
      }
    }

    await ScoreSaberScoreModel.create(score);
    if (log) {
      Logger.info(
        `Tracked ScoreSaber score "${score.scoreId}" for "${player.name}"(${player.id}) in ${(performance.now() - before).toFixed(0)}ms`
      );
    }
    return { score: score, tracked: true };
  }

  /**
   * Gets the top tracked scores.
   *
   * @param amount the amount of scores to get
   * @param timeframe the timeframe to filter by
   * @returns the top scores
   */
  public static async getTopScores(amount: number = 100, timeframe: Timeframe) {
    let daysAgo = -1;
    if (timeframe === "daily") {
      daysAgo = 1;
    } else if (timeframe === "weekly") {
      daysAgo = 8;
    } else if (timeframe === "monthly") {
      daysAgo = 31;
    }
    const foundScores = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          ...(timeframe === "all" ? {} : { timestamp: { $gte: getDaysAgoDate(daysAgo) } }),
          pp: { $gt: 0 },
        },
      },
      { $sort: { pp: -1 } },
      { $limit: amount },
    ]);

    const scores: (PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> | null)[] = [];
    for (const rawScore of foundScores) {
      const score = scoreToObject(rawScore);

      const leaderboardResponse = await LeaderboardService.getLeaderboard(
        score.leaderboardId + "",
        {
          includeBeatSaver: false,
          cacheOnly: true,
        }
      );
      if (!leaderboardResponse) {
        continue; // Skip this score if no leaderboardResponse is found
      }

      const { leaderboard, beatsaver } = leaderboardResponse;

      try {
        const player = await ScoreSaberService.getCachedPlayer(score.playerId, true).catch(
          () => undefined
        );
        if (player) {
          score.playerInfo = {
            id: player.id,
            name: player.name,
          };
        }
      } catch {
        score.playerInfo = {
          id: score.playerId,
        };
      }

      scores.push({
        score: await ScoreService.insertScoreData(score, leaderboard),
        leaderboard: leaderboard,
        beatSaver: beatsaver,
      });
    }

    // Filter out any null entries that might result from skipped scores
    const filteredScores = scores.filter(score => score !== null) as PlayerScore<
      ScoreSaberScore,
      ScoreSaberLeaderboard
    >[];
    return filteredScores;
  }

  /**
   * Inserts the score data into the score.
   *
   * @param score the score to insert data into
   * @param leaderboard the leaderboard to get the data from
   * @returns the score with the data inserted
   */
  public static async insertScoreData(
    score: ScoreSaberScore,
    leaderboard?: ScoreSaberLeaderboard,
    options?: {
      insertAdditionalData?: boolean;
      insertPreviousScore?: boolean;
      insertPlayerInfo?: boolean;
    }
  ) {
    options = {
      insertAdditionalData: true,
      insertPreviousScore: true,
      insertPlayerInfo: true,
      ...options,
    };

    leaderboard = !leaderboard
      ? (await LeaderboardService.getLeaderboard(score.leaderboardId + "")).leaderboard
      : leaderboard;

    // If the leaderboard is not found, return the plain score
    if (!leaderboard) {
      return score;
    }

    const [additionalData, previousScore] = await Promise.all([
      options?.insertAdditionalData
        ? BeatLeaderService.getAdditionalScoreDataFromSong(
            score.playerId,
            leaderboard.songHash,
            `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
            score.score
          )
        : undefined,
      options?.insertPreviousScore
        ? PreviousScoresService.getPreviousScore(
            score.playerId,
            score,
            leaderboard,
            score.timestamp
          )
        : undefined,
    ]);

    if (additionalData !== undefined) {
      score.additionalData = additionalData;
    }
    if (previousScore !== undefined) {
      score.previousScore = previousScore;
    }

    if (options?.insertPlayerInfo) {
      const player = await ScoreSaberService.getCachedPlayer(score.playerId, true).catch(
        () => undefined
      );
      if (player) {
        score.playerInfo = {
          id: player.id,
          name: player.name,
        };
      }
    }

    return score;
  }

  /**
   * Checks if a score is in the top 50 global scores.
   *
   * @param score the score to check
   * @returns whether the score is in the top 50 global scores
   */
  public static async isTop50GlobalScore(score: ScoreSaberScore | ScoreSaberScoreToken) {
    // No need to do a db call if the score is bad
    if (score.pp <= 0 || score.rank < 10) {
      return false;
    }

    const top50Scores = await ScoreService.getTopScores(50, "all");
    const lowestPp = top50Scores.reduce((min, score) => Math.min(min, score.score.pp), Infinity);
    return score.pp > lowestPp;
  }
}
