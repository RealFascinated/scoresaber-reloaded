import { Metadata } from "@ssr/common/types/metadata";
import { NotFoundError } from "elysia";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { Leaderboards } from "@ssr/common/leaderboard";
import LeaderboardService, { SCORESABER_REQUEST_COOLDOWN } from "./leaderboard.service";
import { PlayerScore } from "@ssr/common/score/player-score";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { fetchWithCache } from "../common/cache.util";
import { ScoreType } from "@ssr/common/model/score/score";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import {
  ScoreSaberPreviousScoreOverview,
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Leaderboard from "@ssr/common/model/leaderboard/leaderboard";
import CacheService, { ServiceCache } from "./cache.service";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import BeatLeaderService from "./beatleader.service";
import { delay } from "@ssr/common/utils/utils";
import { PlayerService } from "./player.service";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { Timeframe } from "@ssr/common/timeframe";
import {
  ScoreSaberPreviousScoreDocument,
  ScoreSaberPreviousScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-previous-score";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { removeObjectFields } from "@ssr/common/object.util";
import Logger from "@ssr/common/logger";

export class ScoreService {
  public static async lookupPlayerScores(
    playerId: string,
    page: number,
    sort: string,
    search?: string
  ): Promise<PlayerScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.PlayerScores),
      `player-scores:${playerId}-${page}-${sort}-${search}`,
      async () => {
        const scores: PlayerScore<unknown, unknown>[] = [];
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        const leaderboardScores = await scoresaberService.lookupPlayerScores({
          playerId,
          page,
          sort: sort as ScoreSort,
          search,
        });
        if (leaderboardScores == undefined) {
          return undefined;
        }

        metadata = new Metadata(
          Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
          leaderboardScores.metadata.total,
          leaderboardScores.metadata.page,
          leaderboardScores.metadata.itemsPerPage
        );

        const scorePromises = leaderboardScores.playerScores.map(async token => {
          const leaderboardResponse = await LeaderboardService.getLeaderboard(token.leaderboard.id + "");

          if (!leaderboardResponse) {
            return undefined;
          }
          const { leaderboard, beatsaver } = leaderboardResponse;
          let score = getScoreSaberScoreFromToken(token.score, leaderboard, playerId);
          if (!score) {
            return undefined;
          }

          score = await ScoreService.insertScoreData(score, leaderboard);
          return {
            score: score,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
        });

        const resolvedScores = (await Promise.all(scorePromises)).filter(s => s !== undefined);
        scores.push(...resolvedScores);

        return {
          scores: scores,
          metadata: metadata,
        };
      }
    );
  }

  /**
   * Gets scores for a leaderboard.
   *
   * @param leaderboardName the leaderboard to get the scores from
   * @param leaderboardId the leaderboard id
   * @param page the page to get
   * @param country the country to get scores in
   * @returns the scores
   */
  public static async getLeaderboardScores(
    leaderboardName: Leaderboards,
    leaderboardId: string,
    page: number,
    country?: string
  ): Promise<LeaderboardScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.LeaderboardScores),
      `leaderboard-scores:${leaderboardName}-${leaderboardId}-${page}-${country}`,
      async () => {
        const scores: ScoreType[] = [];
        let leaderboard: Leaderboard | undefined;
        let beatSaverMap: BeatSaverMapResponse | undefined;
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        switch (leaderboardName) {
          case "scoresaber": {
            const leaderboardResponse = await LeaderboardService.getLeaderboard(leaderboardId);
            if (leaderboardResponse == undefined) {
              throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
            }
            leaderboard = leaderboardResponse.leaderboard;
            beatSaverMap = leaderboardResponse.beatsaver;

            const leaderboardScores = await scoresaberService.lookupLeaderboardScores(leaderboardId, page, country);
            if (leaderboardScores == undefined) {
              break;
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

              const additionalData = await BeatLeaderService.getAdditionalScoreData(
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
            break;
          }
          default: {
            throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
          }
        }

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
      const score = this.scoreToObject(rawScore);

      if (options?.includeLeaderboard) {
        const leaderboard = await LeaderboardService.getLeaderboard(score.leaderboardId + "", {
          cacheOnly: true,
          includeBeatSaver: false,
        });
        if (!leaderboard.cached) {
          await delay(SCORESABER_REQUEST_COOLDOWN);
        }
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
   * Gets the player's score history for a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   * @param page the page to get
   */
  public static async getScoreHistory(
    playerId: string,
    leaderboardId: string,
    page: number
  ): Promise<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>> {
    const scores = await ScoreSaberPreviousScoreModel.find({ playerId: playerId, leaderboardId: leaderboardId }).sort({
      timestamp: -1,
    });
    if (scores == null || scores.length == 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    return new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(8)
      .setTotalItems(scores.length)
      .getPage(page, async () => {
        const toReturn: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[] = [];
        for (const scoreToken of scores) {
          let score = scoreToken.toObject() as ScoreSaberScore;

          const leaderboardResponse = await LeaderboardService.getLeaderboard(leaderboardId);
          if (leaderboardResponse == undefined) {
            throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
          }
          const { leaderboard, beatsaver } = leaderboardResponse;

          score = await ScoreService.insertScoreData(score, leaderboard);
          toReturn.push({
            score: score,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          });
        }

        return toReturn;
      });
  }

  /**
   * Gets the player's previous score for a map.
   *
   * @param playerId the player's id to get the previous score for
   * @param score the score to get the previous score for
   * @param leaderboard the leaderboard to get the previous score on
   * @param timestamp the score's timestamp to get the previous score for
   * @returns the score, or undefined if none
   */
  public static async getPreviousScore(
    playerId: string,
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    timestamp: Date
  ): Promise<ScoreSaberPreviousScoreOverview | undefined> {
    const scores: ScoreSaberPreviousScoreDocument[] = await ScoreSaberPreviousScoreModel.find({
      playerId: playerId,
      leaderboardId: leaderboard.id,
    }).sort({
      timestamp: -1,
    });
    if (scores == null || scores.length == 0) {
      return undefined;
    }

    // get first score before timestamp
    const previousScore = scores.find(score => score.timestamp.getTime() < timestamp.getTime());
    if (previousScore == undefined) {
      return undefined;
    }

    return {
      score: previousScore.score,
      accuracy: previousScore.accuracy || (score.score / leaderboard.maxScore) * 100,
      modifiers: previousScore.modifiers,
      misses: previousScore.misses,
      missedNotes: previousScore.missedNotes,
      badCuts: previousScore.badCuts,
      fullCombo: previousScore.fullCombo,
      pp: previousScore.pp,
      weight: previousScore.weight,
      maxCombo: previousScore.maxCombo,
      timestamp: previousScore.timestamp,
      change: {
        score: score.score - previousScore.score,
        accuracy:
          (score.accuracy || (score.score / leaderboard.maxScore) * 100) -
          (previousScore.accuracy || (previousScore.score / leaderboard.maxScore) * 100),
        misses: score.misses - previousScore.misses,
        missedNotes: score.missedNotes - previousScore.missedNotes,
        badCuts: score.badCuts - previousScore.badCuts,
        pp: score.pp - previousScore.pp,
        weight: score.weight && previousScore.weight && score.weight - previousScore.weight,
        maxCombo: score.maxCombo - previousScore.maxCombo,
      },
    } as ScoreSaberPreviousScoreOverview;
  }

  /**
   * Gets friend scores for a leaderboard.
   *
   * @param friendIds the friend ids
   * @param leaderboardId the leaderboard id
   * @param page the page to fetch
   */
  public static async getFriendScores(
    friendIds: string[],
    leaderboardId: number,
    page: number
  ): Promise<Page<ScoreSaberScore>> {
    const scores: ScoreSaberScore[] = await fetchWithCache(
      CacheService.getCache(ServiceCache.FriendScores),
      `friend-scores:${friendIds.join(",")}-${leaderboardId}`,
      async () => {
        const scores: ScoreSaberScore[] = [];
        for (const friendId of friendIds) {
          await PlayerService.getPlayer(friendId); // Ensures player exists

          const friendScores = await ScoreSaberScoreModel.aggregate([
            { $match: { playerId: friendId, leaderboardId: leaderboardId } },
            { $sort: { timestamp: -1 } },
            { $sort: { score: -1 } },
          ]);
          for (const friendScore of friendScores) {
            const score = this.scoreToObject(friendScore);
            scores.push(await ScoreService.insertScoreData(score));
          }
        }

        return scores;
      }
    );

    if (scores.length === 0) {
      throw new NotFoundError(`No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`);
    }

    const pagination = new Pagination<ScoreSaberScore>();
    pagination.setItems(scores);
    pagination.setTotalItems(scores.length);
    pagination.setItemsPerPage(8);
    return pagination.getPage(page);
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
    playerId?: string
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
        let score = this.scoreToObject(rawScore);

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
      BeatLeaderService.getAdditionalScoreData(
        score.playerId,
        leaderboard.songHash,
        `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
        score.score
      ),
      ScoreService.getPreviousScore(score.playerId, score, leaderboard, score.timestamp),
    ]);

    if (additionalData !== undefined) {
      score.additionalData = additionalData.toObject();
    }
    if (previousScore) {
      score.previousScore = previousScore;
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

  /**
   * Converts a database score to a ScoreSaberScore.
   *
   * @param score the score to convert
   * @returns the converted score
   */
  private static scoreToObject(score: ScoreSaberScore): ScoreSaberScore {
    return {
      ...removeObjectFields<ScoreSaberScore>(score, ["_id", "__v"]),
      id: score._id,
    } as ScoreSaberScore;
  }
}
