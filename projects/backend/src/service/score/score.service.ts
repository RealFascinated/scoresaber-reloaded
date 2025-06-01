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
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { Timeframe } from "@ssr/common/timeframe";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { Metadata } from "@ssr/common/types/metadata";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { connectBeatLeaderWebsocket } from "@ssr/common/websocket/beatleader-websocket";
import { connectScoresaberWebsocket } from "@ssr/common/websocket/scoresaber-websocket";
import { NotFoundError } from "elysia";
import { fetchWithCache } from "../../common/cache.util";
import { scoreToObject } from "../../common/score/score.util";
import TrackedScoresMetric from "../../metrics/impl/tracked-scores";
import BeatLeaderService from "../beatleader.service";
import CacheService, { ServiceCache } from "../cache.service";
import LeaderboardService from "../leaderboard.service";
import MetricsService, { MetricType } from "../metrics.service";
import { PlayerService } from "../player.service";
import ScoreSaberService from "../scoresaber.service";
import { PreviousScoresService } from "./previous-scores.service";

interface PendingScore {
  scoreToken: ScoreSaberScoreToken;
  leaderboardToken: ScoreSaberLeaderboardToken;
  player: ScoreSaberPlayerToken;
  timestamp: number;
}

export class ScoreService {
  private static pendingScores = new Map<string, PendingScore>();

  constructor() {
    // Connect to websockets
    connectScoresaberWebsocket({
      onScore: async score => {
        // Fetch player info
        const player = await ScoreSaberService.updatePlayerCache(score.score.leaderboardPlayerInfo);
        if (player == undefined) {
          return;
        }

        // Create a unique key for this score
        const key = `${player.id}-${score.leaderboard.songHash.toUpperCase()}-${score.leaderboard.difficulty.difficulty}-${score.leaderboard.difficulty.gameMode.replace("Solo", "")}`;

        // Add to pending scores with timestamp
        ScoreService.pendingScores.set(key, {
          scoreToken: score.score,
          leaderboardToken: score.leaderboard,
          player,
          timestamp: Date.now(),
        });

        // Set timeout to process score if no BeatLeader match is found
        setTimeout(() => {
          const pendingScore = ScoreService.pendingScores.get(key);
          if (pendingScore) {
            ScoreService.pendingScores.delete(key);
            this.processScoreSaberScore(
              pendingScore.scoreToken,
              pendingScore.leaderboardToken,
              pendingScore.player
            );
          }
        }, 10000); // 10 seconds timeout
      },
    });

    connectBeatLeaderWebsocket({
      onScore: async beatLeaderScore => {
        // Try to find matching ScoreSaber score
        const key = `${beatLeaderScore.playerId}-${beatLeaderScore.leaderboard.song.hash.toUpperCase()}-${beatLeaderScore.leaderboard.difficulty.value}-${beatLeaderScore.leaderboard.difficulty.modeName.replace("Solo", "")}`;
        const pendingScore = ScoreService.pendingScores.get(key);

        if (pendingScore) {
          // Found a match, remove from pending and process both scores
          ScoreService.pendingScores.delete(key);
          await this.processMatchingScores(
            pendingScore.scoreToken,
            pendingScore.leaderboardToken,
            pendingScore.player,
            beatLeaderScore
          );
        } else {
          // No match found, process BeatLeader score normally
          await BeatLeaderService.trackBeatLeaderScore(beatLeaderScore);
        }
      },
    });
  }

  /**
   * Processes a ScoreSaber score and its matching BeatLeader score if available.
   *
   * @param scoreSaberToken the ScoreSaber score to process
   * @param leaderboardToken the leaderboard for the score
   * @param player the player for the score
   * @param beatLeaderScore optional matching BeatLeader score
   */
  private async processMatchingScores(
    scoreSaberToken: ScoreSaberScoreToken,
    leaderboardToken: ScoreSaberLeaderboardToken,
    player: ScoreSaberPlayerToken,
    beatLeaderScore?: BeatLeaderScoreToken
  ) {
    // Track ScoreSaber score
    await ScoreService.trackScoreSaberScore(scoreSaberToken, leaderboardToken, player);
    await PlayerService.updatePlayerScoresSet({
      score: scoreSaberToken,
      leaderboard: leaderboardToken,
    });

    // Track BeatLeader score if available
    if (beatLeaderScore) {
      await BeatLeaderService.trackBeatLeaderScore(beatLeaderScore);
    }

    // Notify
    await ScoreSaberService.notifyScore(
      { score: scoreSaberToken, leaderboard: leaderboardToken },
      player,
      "scoreFloodGate",
      beatLeaderScore
    );
    await ScoreSaberService.notifyScore(
      { score: scoreSaberToken, leaderboard: leaderboardToken },
      player,
      "numberOne",
      beatLeaderScore
    );
    await ScoreSaberService.notifyScore(
      { score: scoreSaberToken, leaderboard: leaderboardToken },
      player,
      "top50AllTime",
      beatLeaderScore
    );

    // Update metric
    const trackedScoresMetric = (await MetricsService.getMetric(
      MetricType.TRACKED_SCORES
    )) as TrackedScoresMetric;
    trackedScoresMetric.increment();

    Logger.info(
      `Processed score for ${player.name}. ScoreSaber: ${scoreSaberToken != undefined ? true : false}, BeatLeader: ${beatLeaderScore != undefined ? true : false}`
    );
  }

  /**
   * Processes a ScoreSaber score.
   *
   * @param scoreToken the score to process
   * @param leaderboardToken the leaderboard for the score
   * @param player the player for the score
   */
  private async processScoreSaberScore(
    scoreToken: ScoreSaberScoreToken,
    leaderboardToken: ScoreSaberLeaderboardToken,
    player: ScoreSaberPlayerToken
  ) {
    // Track score
    await ScoreService.trackScoreSaberScore(scoreToken, leaderboardToken, player);
    await PlayerService.updatePlayerScoresSet({ score: scoreToken, leaderboard: leaderboardToken });

    // Notify
    await ScoreSaberService.notifyScore(
      { score: scoreToken, leaderboard: leaderboardToken },
      player,
      "scoreFloodGate"
    );
    await ScoreSaberService.notifyScore(
      { score: scoreToken, leaderboard: leaderboardToken },
      player,
      "numberOne"
    );
    await ScoreSaberService.notifyScore(
      { score: scoreToken, leaderboard: leaderboardToken },
      player,
      "top50AllTime"
    );

    // Update metric
    const trackedScoresMetric = (await MetricsService.getMetric(
      MetricType.TRACKED_SCORES
    )) as TrackedScoresMetric;
    trackedScoresMetric.increment();
  }

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

        const leaderboardScores = await scoresaberService.lookupLeaderboardScores(
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
   * @param scoreToken the score to track
   * @param leaderboardToken the leaderboard for the score
   * @param playerId the id of the player
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    scoreToken: ScoreSaberScoreToken,
    leaderboardToken: ScoreSaberLeaderboardToken,
    player: ScoreSaberPlayerToken,
    log: boolean = true
  ) {
    const before = performance.now();
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    const score = getScoreSaberScoreFromToken(scoreToken, leaderboard, player.id);

    if (await ScoreService.scoreExists(player.id, leaderboard, score)) {
      // Logger.info(
      //   `Score "${score.scoreId}" for "${player.name}"(${player.id}) already exists, skipping`
      // );
      return false;
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
}
