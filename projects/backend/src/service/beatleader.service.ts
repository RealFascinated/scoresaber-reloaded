import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { MinioBucket } from "@ssr/common/minio-buckets";
import {
  AdditionalScoreData,
  AdditionalScoreDataModel,
} from "@ssr/common/model/additional-score-data/additional-score-data";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { removeObjectFields } from "@ssr/common/object.util";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { BeatLeaderScoreImprovementToken } from "@ssr/common/types/token/beatleader/score/score-improvement";
import { getBeatLeaderReplayId } from "@ssr/common/utils/beatleader-utils";
import Request from "@ssr/common/utils/request";
import { isProduction } from "@ssr/common/utils/utils";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { fetchWithCache } from "../common/cache.util";
import { createGenericEmbed } from "../common/discord/embed";
import TrackedScoresMetric from "../metrics/impl/player/tracked-scores";
import CacheService, { ServiceCache } from "./cache.service";
import MetricsService, { MetricType } from "./metrics.service";
import MinioService from "./minio.service";
import { PlayerService } from "./player/player.service";

export default class BeatLeaderService {
  /**
   * Gets the additional score data for a player's score.
   *
   * @param playerId the id of the player
   * @param songHash the hash of the map
   * @param songDifficulty the difficulty of the map
   * @param songScore the score of the play
   * @private
   */
  public static async getAdditionalScoreDataFromSong(
    playerId: string,
    songHash: string,
    songDifficulty: string,
    songCharacteristic: string,
    songScore: number
  ): Promise<AdditionalScoreData | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.AdditionalScoreData),
      `additional-score-data:${playerId}-${songHash}-${songDifficulty}-${songScore}`,
      async () => {
        const additionalData = await AdditionalScoreDataModel.findOne({
          playerId: playerId,
          songHash: songHash.toUpperCase(),
          songDifficulty: songDifficulty,
          songCharacteristic: songCharacteristic,
          songScore: songScore,
        }).lean();
        if (!additionalData) {
          return undefined;
        }
        return this.additionalScoreDataToObject(additionalData);
      }
    );
  }

  /**
   * Gets the additional score data for a player's score.
   *
   * @param scoreId the id of the score
   * @private
   */
  public static async getAdditionalScoreData(
    scoreId: number
  ): Promise<AdditionalScoreData | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.AdditionalScoreData),
      `additional-score-data:${scoreId}`,
      async () => {
        const additionalData = await AdditionalScoreDataModel.findOne({
          scoreId: scoreId,
        }).lean();
        if (!additionalData) {
          return undefined;
        }
        return this.additionalScoreDataToObject(additionalData);
      }
    );
  }

  /**
   * Tracks BeatLeader score.
   *
   * @param score the score to track
   */
  public static async trackBeatLeaderScore(
    score: BeatLeaderScoreToken,
    isTop50GlobalScore?: boolean
  ) {
    const before = Date.now();

    const { playerId, player: scorePlayer, leaderboard } = score;
    const player: PlayerDocument | null = await fetchWithCache(
      CacheService.getCache(ServiceCache.Players),
      `player:${playerId}`,
      async () => {
        return await PlayerModel.findById(playerId);
      }
    );

    // Only track for players that are being tracked
    if (player == null) {
      return;
    }

    const getMisses = (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) => {
      return score.missedNotes + score.badCuts + score.bombCuts;
    };

    const difficulty = leaderboard.difficulty;
    const rawScoreImprovement = score.scoreImprovement;
    const data = {
      playerId: playerId,
      songHash: leaderboard.song.hash.toUpperCase(),
      songDifficulty: difficulty.difficultyName,
      songCharacteristic: difficulty.modeName,
      songScore: score.baseScore,
      scoreId: score.id,
      leaderboardId: leaderboard.id,
      misses: {
        misses: getMisses(score),
        missedNotes: score.missedNotes,
        bombCuts: score.bombCuts,
        badCuts: score.badCuts,
        wallsHit: score.wallsHit,
      },
      pauses: score.pauses,
      fcAccuracy: score.fcAccuracy * 100,
      fullCombo: score.fullCombo,
      handAccuracy: {
        left: score.accLeft,
        right: score.accRight,
      },
      timestamp: new Date(Number(score.timeset) * 1000),
    } as AdditionalScoreData;

    if (rawScoreImprovement && rawScoreImprovement.score > 0) {
      data.scoreImprovement = {
        score: rawScoreImprovement.score,
        misses: {
          misses: getMisses(rawScoreImprovement),
          missedNotes: rawScoreImprovement.missedNotes,
          bombCuts: rawScoreImprovement.bombCuts,
          badCuts: rawScoreImprovement.badCuts,
          wallsHit: rawScoreImprovement.wallsHit,
        },
        accuracy: rawScoreImprovement.accuracy * 100,
        pauses: rawScoreImprovement.pauses,
        handAccuracy: {
          left: rawScoreImprovement.accLeft,
          right: rawScoreImprovement.accRight,
        },
      };
    }

    // Parallelize independent operations
    const [, replayData] = await Promise.all([
      // Save score stats
      ApiServiceRegistry.getInstance()
        .getBeatLeaderService()
        .lookupScoreStats(score.id)
        .then(async stats => {
          if (stats) {
            await this.trackScoreStats(score.id, stats);
          }
          return stats;
        }),

      // Save replay data if needed
      (async () => {
        if (isProduction() && player && (player.trackReplays || isTop50GlobalScore)) {
          try {
            const replayId = getBeatLeaderReplayId(data);
            const replay = await Request.get<ArrayBuffer>(
              `https://cdn.replays.beatleader.xyz/${replayId}`,
              { returns: "arraybuffer" }
            );

            if (replay !== undefined) {
              await MinioService.saveFile(
                MinioBucket.BeatLeaderReplays,
                `${replayId}`,
                Buffer.from(replay)
              );
              return true;
            }
          } catch (error) {
            logToChannel(
              DiscordChannels.backendLogs,
              createGenericEmbed(
                "BeatLeader Replays",
                `Failed to save replay for ${score.id}: ${error}`
              )
            );
            console.error(`Failed to save replay for ${score.id}: ${error}`);
          }
        }
        return false;
      })(),
    ]);

    data.savedReplay = replayData;

    await AdditionalScoreDataModel.create(data);

    // Update metric
    const trackedScoresMetric = (await MetricsService.getMetric(
      MetricType.TRACKED_SCORES
    )) as TrackedScoresMetric;
    trackedScoresMetric.increment();

    Logger.info(
      `Tracked additional score data for "${scorePlayer.name}"(${playerId}) in ${Date.now() - before}ms`
    );
  }

  /*
   * Track score stats.
   *
   * @param scoreId the id of the score
   * @param scoreStats the stats to track
   */
  private static async trackScoreStats(
    scoreId: number,
    scoreStats: ScoreStatsToken
  ): Promise<ScoreStatsToken> {
    await MinioService.saveFile(
      MinioBucket.BeatLeaderScoreStats,
      `${scoreId}.json`,
      Buffer.from(JSON.stringify(scoreStats))
    );
    return scoreStats;
  }

  /**
   * Gets the score stats for a score id.
   *
   * @param scoreId the id of the score
   */
  public static async getScoreStats(scoreId: number): Promise<ScoreStatsToken | undefined> {
    const additionalScoreData = await this.getAdditionalScoreData(scoreId);

    let scoreStats: ScoreStatsToken | null = await fetchWithCache(
      CacheService.getCache(ServiceCache.ScoreStats),
      `score-stats:${scoreId}`,
      async () => {
        const file = await MinioService.getFile(
          MinioBucket.BeatLeaderScoreStats,
          `${scoreId}.json`
        );
        return file ? (JSON.parse(file.toString()) as ScoreStatsToken) : null;
      }
    );
    if (scoreStats == null) {
      scoreStats = (await ApiServiceRegistry.getInstance()
        .getBeatLeaderService()
        .lookupScoreStats(scoreId)) as ScoreStatsToken;
      // Only track score stats if the player exists
      if (
        scoreStats &&
        additionalScoreData &&
        (await PlayerService.playerExists(additionalScoreData.playerId))
      ) {
        return await this.trackScoreStats(scoreId, scoreStats);
      }
    }

    if (scoreStats == null) {
      return undefined;
    }
    return scoreStats;
  }

  /**
   * Gets the player's previous score stats for a map.
   *
   * @param scoreId the score id to get the previous score stats for
   * @returns the score stats, or undefined if none
   * @private
   */
  public static async getPreviousScoreStats(scoreId: number): Promise<ScoreStatsToken | undefined> {
    const current = await this.getAdditionalScoreData(scoreId);
    if (current == undefined) {
      return undefined;
    }

    const previous = await this.getPreviousAdditionalScoreData(
      current.playerId,
      current.songHash,
      current.leaderboardId,
      current.timestamp
    );
    if (previous == undefined) {
      return undefined;
    }

    return this.getScoreStats(previous.scoreId);
  }

  /**
   * Gets the player's previous additional score data for a map.
   *
   * @param playerId the player's id to get the previous additional score data for
   * @param songHash the hash of the map to get the previous additional score data for
   * @param leaderboardId the leaderboard id to get the previous additional score data for
   * @param timestamp the timestamp to get the previous additional score data for
   * @returns the additional score data, or undefined if none
   */
  public static async getPreviousAdditionalScoreData(
    playerId: string,
    songHash: string,
    leaderboardId: string,
    timestamp: Date
  ): Promise<AdditionalScoreData | undefined> {
    const scores: AdditionalScoreData[] = await AdditionalScoreDataModel.find({
      playerId: playerId,
      songHash: songHash.toUpperCase(),
      leaderboardId: leaderboardId,
    })
      .sort({ timestamp: -1 })
      .lean();

    if (scores == null || scores.length == 0) {
      return undefined;
    }

    const additionalData = scores.find(score => score.timestamp.getTime() < timestamp.getTime());
    if (additionalData == undefined) {
      return undefined;
    }
    return this.additionalScoreDataToObject(additionalData);
  }

  /**
   * Converts a database additional score data to a AdditionalScoreData.
   *
   * @param additionalData the additional score data to convert
   * @returns the converted additional score data
   * @private
   */
  private static additionalScoreDataToObject(
    additionalData: AdditionalScoreData
  ): AdditionalScoreData {
    return {
      ...removeObjectFields<AdditionalScoreData>(additionalData, ["_id", "__v"]),
    } as AdditionalScoreData;
  }
}
