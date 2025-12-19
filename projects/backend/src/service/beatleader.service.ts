import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { MinioBucket } from "@ssr/common/minio-buckets";
import {
  BeatLeaderScore,
  BeatLeaderScoreModel,
} from "@ssr/common/model/beatleader-score/beatleader-score";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { ScoreStatsResponse } from "@ssr/common/schemas/beatleader/score-stats";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { BeatLeaderScoreImprovementToken } from "@ssr/common/types/token/beatleader/score/score-improvement";
import { getBeatLeaderReplayId } from "@ssr/common/utils/beatleader-utils";
import { beatLeaderScoreToObject } from "@ssr/common/utils/model-converters";
import Request from "@ssr/common/utils/request";
import { isProduction } from "@ssr/common/utils/utils";
import mongoose from "mongoose";
import { DiscordChannels, sendEmbedToChannel } from "../bot/bot";
import { createGenericEmbed } from "../common/discord/embed";
import CacheService, { CacheId } from "./cache.service";
import MinioService from "./minio.service";

export default class BeatLeaderService {
  /**
   * Gets the BeatLeader score for a player's score.
   *
   * @param playerId the id of the player
   * @param songHash the hash of the map
   * @param songDifficulty the difficulty of the map
   * @param songCharacteristic the characteristic of the map
   * @param songScore the score of the play
   * @returns the BeatLeader score, or undefined if none
   */
  public static async getBeatLeaderScoreFromSong(
    playerId: string,
    songHash: string,
    songDifficulty: string,
    songCharacteristic: string,
    songScore: number
  ): Promise<BeatLeaderScore | undefined> {
    return CacheService.fetchWithCache(
      CacheId.BeatLeaderScore,
      `beatleader-score:${playerId}-${songHash}-${songDifficulty}-${songScore}`,
      async () => {
        const beatLeaderScore = await BeatLeaderScoreModel.findOne({
          playerId: playerId,
          songHash: songHash.toUpperCase(),
          songDifficulty: songDifficulty,
          songCharacteristic: songCharacteristic,
          songScore: songScore,
        }).lean();
        if (!beatLeaderScore) {
          return undefined;
        }
        return beatLeaderScoreToObject(beatLeaderScore);
      }
    );
  }

  /**
   * Gets the BeatLeader score for a player's score.
   *
   * @param scoreId the id of the score
   * @returns the BeatLeader score, or undefined if none
   */
  public static async getBeatLeaderScore(
    scoreId: number
  ): Promise<BeatLeaderScore | undefined> {
    return CacheService.fetchWithCache(
      CacheId.BeatLeaderScore,
      `beatleader-score:${scoreId}`,
      async () => {
        const beatLeaderScore = await BeatLeaderScoreModel.findOne({
          scoreId: scoreId,
        }).lean();
        if (!beatLeaderScore) {
          return undefined;
        }
        return beatLeaderScoreToObject(beatLeaderScore);
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
  ): Promise<BeatLeaderScore | undefined> {
    const { playerId, leaderboard } = score;
    const player: Player | null = await CacheService.fetchWithCache(
      CacheId.Players,
      `player:${playerId}`,
      async () => {
        return await PlayerModel.findById(playerId).lean();
      }
    );

    // Only track for players that are being tracked
    if (player == null) {
      return undefined;
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
    } as BeatLeaderScore;

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
    const [savedReplay] = await Promise.all([
      // Save replay data if needed
      (async () => {
        if (isProduction() && player && (player.trackReplays || isTop50GlobalScore)) {
          try {
            const replayId = getBeatLeaderReplayId(data);
            const replay = await Request.get<ArrayBuffer>(
              `https://cdn.replays.beatleader.xyz/${replayId}`,
              {
                returns: "arraybuffer",
              }
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
            sendEmbedToChannel(
              DiscordChannels.BACKEND_LOGS,
              createGenericEmbed(
                "BeatLeader Replays",
                `Failed to save replay for ${score.id}: ${error}`
              )
            );
            Logger.error(`Failed to save replay for ${score.id}: ${error}`);
          }
        }
        return false;
      })(),
    ]);

    if (savedReplay) {
      data.savedReplay = savedReplay;
    }

    // Check if score already exists
    const existingScore = await BeatLeaderScoreModel.findOne({
      scoreId: score.id,
    }).lean();

    if (existingScore) {
      return beatLeaderScoreToObject(existingScore);
    }

    await BeatLeaderScoreModel.create({
      ...data,
      _id: new mongoose.Types.ObjectId(), // Generate a new _id
    });
    Logger.info(`Tracked BeatLeader score "${score.id}" for "${player.name}"(${playerId})`);
    return data;
  }

  /**
   * Gets the score stats for a score id.
   *
   * @param scoreId the id of the score
   */
  public static async getScoreStats(scoreId: number): Promise<ScoreStatsToken | undefined> {
    return CacheService.fetchWithCache(CacheId.ScoreStats, `score-stats:${scoreId}`, async () => {
      return (await ApiServiceRegistry.getInstance()
        .getBeatLeaderService()
        .lookupScoreStats(scoreId)) as ScoreStatsToken;
    });
  }

  /**
   * Gets the player's full score stats for a map.
   *
   * @param scoreId the score id to get the full score stats for
   * @returns the score stats
   * @throws NotFoundError if the score stats are not found
   */
  public static async getScoresFullScoreStats(scoreId: number): Promise<ScoreStatsResponse> {
    const current = await this.getBeatLeaderScore(scoreId);
    if (current == undefined) {
      throw new NotFoundError(`Score ${scoreId} not found`);
    }

    const previous = await this.getPreviousBeatLeaderScore(
      current.playerId,
      current.songHash,
      current.leaderboardId,
      current.timestamp
    );

    const [currentStats, previousStats] = await Promise.all([
      this.getScoreStats(current.scoreId),
      previous ? this.getScoreStats(previous.scoreId) : undefined,
    ]);
    if (!currentStats) {
      throw new NotFoundError(`Score stats not found for score ${scoreId}`);
    }

    return {
      current: currentStats,
      previous: previousStats,
    };
  }

  /**
   * Gets the player's previous BeatLeader score for a map.
   *
   * @param playerId the player's id to get the previous BeatLeader score for
   * @param songHash the hash of the map to get the previous BeatLeader score for
   * @param leaderboardId the leaderboard id to get the previous BeatLeader score for
   * @param timestamp the timestamp to get the previous BeatLeader score for
   * @returns the BeatLeader score, or undefined if none
   */
  public static async getPreviousBeatLeaderScore(
    playerId: string,
    songHash: string,
    leaderboardId: string,
    timestamp: Date
  ): Promise<BeatLeaderScore | undefined> {
    const scores: BeatLeaderScore[] = await BeatLeaderScoreModel.find({
      playerId: playerId,
      songHash: songHash.toUpperCase(),
      leaderboardId: leaderboardId,
    })
      .sort({ timestamp: -1 })
      .lean();

    if (scores == null || scores.length == 0) {
      return undefined;
    }

    const beatLeaderScore = scores.find(score => score.timestamp.getTime() < timestamp.getTime());
    if (beatLeaderScore == undefined) {
      return undefined;
    }
    return beatLeaderScoreToObject(beatLeaderScore);
  }
}
