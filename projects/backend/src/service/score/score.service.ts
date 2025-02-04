import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import {
  ScoreSaberPreviousScoreDocument,
  ScoreSaberPreviousScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberPreviousScoreOverview,
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { ScoreType } from "@ssr/common/model/score/score";
import { removeObjectFields } from "@ssr/common/object.util";
import { Page, Pagination } from "@ssr/common/pagination";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { Timeframe } from "@ssr/common/timeframe";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { Metadata } from "@ssr/common/types/metadata";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { NotFoundError } from "elysia";
import { fetchWithCache } from "../../common/cache.util";
import CacheService, { ServiceCache } from "../cache.service";
import LeaderboardService from "../leaderboard.service";
import BeatLeaderService from "../beatleader.service";
import { PlayerService } from "../player.service";
import { scoreToObject } from "../../common/score/score.util";
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

        const leaderboardScores = await scoresaberService.lookupLeaderboardScores(leaderboardId, page, country);
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
    const rawScores = await ScoreSaberScoreModel.aggregate([
      // Match stage based on playerId and optional ranked filter
      { $match: { playerId: playerId, ...(options?.ranked ? { pp: { $gt: 0 } } : {}) } },

      // Sort by pp in descending order
      { $sort: { [`${options.sort}`]: -1 } },

      // Optional projection stage
      ...(options?.projection
        ? [
            {
              $project: {
                ...options.projection,
                _id: 0,
                leaderboardId: 1,
                playerId: 1,
              },
            },
          ]
        : []),

      // Limit results
      ...(options?.limit ? [{ $limit: options.limit }] : []),
    ]);
    if (!rawScores) {
      return [];
    }

    const scores: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[] = [];
    for (const rawScore of rawScores) {
      const score = scoreToObject(rawScore);

      if (options?.includeLeaderboard) {
        const leaderboard = await LeaderboardService.getLeaderboard(score.leaderboardId + "", {
          cacheOnly: true,
          includeBeatSaver: false,
        });
        scores.push({
          score: score as ScoreSaberScore,
          leaderboard: leaderboard.leaderboard,
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        scores.push({
          score: score as ScoreSaberScore,
        });
      }
    }
    return scores;
  }

  /**
   * Checks if a ScoreSaber score already exists.
   *
   * @param playerId the id of the player
   * @param leaderboard the leaderboard
   * @param score the score to check
   */
  public static async scoreExists(playerId: string, leaderboard: ScoreSaberLeaderboard, score: ScoreSaberScore) {
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
   * @param scoreToken the score to track
   * @param leaderboardToken the leaderboard for the score
   * @param playerId the id of the player
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    scoreToken: ScoreSaberScoreToken,
    leaderboardToken: ScoreSaberLeaderboardToken,
    playerId?: string,
    log: boolean = true
  ) {
    const before = performance.now();
    playerId = (scoreToken.leaderboardPlayerInfo && scoreToken.leaderboardPlayerInfo.id) || playerId;
    if (!playerId) {
      console.error(`Player ID is undefined, unable to track score: ${scoreToken.id}`);
      return;
    }

    const playerName = (scoreToken.leaderboardPlayerInfo && scoreToken.leaderboardPlayerInfo.name) || "Unknown";
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    const score = getScoreSaberScoreFromToken(scoreToken, leaderboard, playerId);

    if (await ScoreService.scoreExists(playerId, leaderboard, score)) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete score.playerInfo;

    // Remove the old score and create a new previous score
    const previousScore = await ScoreSaberScoreModel.findOne({
      playerId: playerId,
      leaderboardId: leaderboard.id,
    });
    if (previousScore) {
      await ScoreSaberScoreModel.deleteOne({
        playerId: playerId,
        leaderboardId: leaderboard.id,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = previousScore.toObject();
      await ScoreSaberPreviousScoreModel.create(rest);

      Logger.info(
        [
          `Removed old score for "${playerName}"(${playerId})`,
          `leaderboard: ${leaderboard.id}`,
          `in ${(performance.now() - before).toFixed(0)}ms`,
        ]
          .filter(s => s !== undefined)
          .join(", ")
      );
    }

    await ScoreSaberScoreModel.create(score);
    Logger.info(
      [
        `Tracked ScoreSaber score for "${playerName}"(${playerId})`,
        `difficulty: ${score.difficulty}`,
        `score: ${score.score}`,
        score.pp > 0 ? `pp: ${score.pp.toFixed(2)}pp` : undefined,
        `leaderboard: ${leaderboard.id}`,
        `hmd: ${score.hmd}`,
        score.controllers !== undefined ? `controller left: ${score.controllers.leftController}` : undefined,
        score.controllers !== undefined ? `controller right: ${score.controllers.rightController}` : undefined,
        `in ${(performance.now() - before).toFixed(0)}ms`,
      ]
        .filter(s => s !== undefined)
        .join(", ")
    );
    return true;
  }

  /**
   * Gets the top tracked scores.
   *
   * @param amount the amount of scores to get
   * @param timeframe the timeframe to filter by
   * @returns the top scores
   */
  public static async getTopScores(amount: number = 100, timeframe: Timeframe) {
    Logger.info(`Getting top scores for timeframe: ${timeframe}, limit: ${amount}...`);
    const before = Date.now();

    let daysAgo = -1;
    if (timeframe === "daily") {
      daysAgo = 1;
    } else if (timeframe === "weekly") {
      daysAgo = 8;
    } else if (timeframe === "monthly") {
      daysAgo = 31;
    }
    const foundScores = await ScoreSaberScoreModel.aggregate([
      { $match: { ...(timeframe === "all" ? {} : { timestamp: { $gte: getDaysAgoDate(daysAgo) } }), pp: { $gt: 0 } } },
      { $sort: { pp: -1 } },
      { $limit: amount },
    ]);

    const scores: (PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> | null)[] = await Promise.all(
      foundScores.map(async rawScore => {
        let score = scoreToObject(rawScore);

        const leaderboardResponse = await LeaderboardService.getLeaderboard(score.leaderboardId + "");
        if (!leaderboardResponse) {
          return null; // Skip this score if no leaderboardResponse is found
        }

        const { leaderboard, beatsaver } = leaderboardResponse;

        try {
          const player = await PlayerService.getPlayer(score.playerId);
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

        score = await ScoreService.insertScoreData(score, leaderboard);
        return {
          score: score,
          leaderboard: leaderboard,
          beatSaver: beatsaver,
        };
      })
    );

    // Filter out any null entries that might result from skipped scores
    const filteredScores = scores.filter(score => score !== null) as PlayerScore<
      ScoreSaberScore,
      ScoreSaberLeaderboard
    >[];

    Logger.info(
      `Got ${filteredScores.length} scores in ${Date.now() - before}ms (timeframe: ${timeframe}, limit: ${amount})`
    );
    return filteredScores;
  }

  /**
   * Inserts the score data into the score.
   *
   * @param score the score to insert data into
   * @param leaderboard the leaderboard to get the data from
   * @returns the score with the data inserted
   */
  public static async insertScoreData(score: ScoreSaberScore, leaderboard?: ScoreSaberLeaderboard) {
    leaderboard = !leaderboard
      ? (await LeaderboardService.getLeaderboard(score.leaderboardId + "")).leaderboard
      : leaderboard;

    // If the leaderboard is not found, return the plain score
    if (!leaderboard) {
      return score;
    }

    const [additionalData, previousScore] = await Promise.all([
      BeatLeaderService.getAdditionalScoreDataFromSong(
        score.playerId,
        leaderboard.songHash,
        `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
        score.score
      ),
      PreviousScoresService.getPreviousScore(score.playerId, score, leaderboard, score.timestamp),
    ]);

    if (additionalData !== undefined) {
      score.additionalData = additionalData;
    }
    if (previousScore) {
      score.previousScore = previousScore;
    }

    const player = await PlayerService.getPlayer(score.playerId).catch(() => undefined);
    if (player) {
      score.playerInfo = {
        id: player.id,
        name: player.name,
      };
    }

    try {
      const scorePpBoundary =
        score.pp > 0 ? await PlayerService.getPlayerPpBoundaryFromScorePp(score.playerId, score.pp) : undefined;
      if (scorePpBoundary) {
        score.ppBoundary = scorePpBoundary;
      }
    } catch {
      // ignored
    }

    return score;
  }
}
