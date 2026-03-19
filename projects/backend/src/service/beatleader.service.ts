import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { StorageBucket } from "@ssr/common/minio-buckets";
import { BeatLeaderScore, BeatLeaderScoreModel } from "@ssr/common/model/beatleader-score/beatleader-score";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { ScoreStatsToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-stats";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { BeatLeaderScoreImprovementToken } from "@ssr/common/schemas/beatleader/tokens/score/score-improvement";
import { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import { getBeatLeaderReplayId } from "@ssr/common/utils/beatleader-utils";
import { beatLeaderScoreToObject } from "@ssr/common/utils/model-converters";
import Request from "@ssr/common/utils/request";
import { isProduction } from "@ssr/common/utils/utils";
import mongoose from "mongoose";
import { DiscordChannels, sendEmbedToChannel } from "../bot/bot";
import { createGenericEmbed } from "../common/discord/embed";
import CacheService, { CacheId } from "./cache.service";
import StorageService from "./storage.service";

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
    return CacheService.fetch(
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
  public static async getBeatLeaderScore(scoreId: number): Promise<BeatLeaderScore | undefined> {
    return CacheService.fetch(CacheId.BeatLeaderScore, `beatleader-score:${scoreId}`, async () => {
      const beatLeaderScore = await BeatLeaderScoreModel.findOne({
        scoreId: scoreId,
      }).lean();
      if (!beatLeaderScore) {
        return undefined;
      }
      return beatLeaderScoreToObject(beatLeaderScore);
    });
  }

  /**
   * Tracks BeatLeader score.
   *
   * @param scoreToken the score to track
   * @param isTop50GlobalScore whether the score is a top 50 global score
   * @returns the BeatLeader score, or undefined if none
   */
  public static async trackBeatLeaderScore(
    scoreToken: BeatLeaderScoreToken,
    isTop50GlobalScore: boolean = false
  ): Promise<BeatLeaderScore | undefined> {
    const { playerId, leaderboard } = scoreToken;
    const player: Player | null = await CacheService.fetch(
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
    const rawScoreImprovement = scoreToken.scoreImprovement;
    const data = {
      playerId: playerId,
      songHash: leaderboard.song.hash.toUpperCase(),
      songDifficulty: difficulty.difficultyName,
      songCharacteristic: difficulty.modeName,
      songScore: scoreToken.baseScore,
      scoreId: scoreToken.id,
      leaderboardId: leaderboard.id,
      misses: {
        misses: getMisses(scoreToken),
        missedNotes: scoreToken.missedNotes,
        bombCuts: scoreToken.bombCuts,
        badCuts: scoreToken.badCuts,
        wallsHit: scoreToken.wallsHit,
      },
      pauses: scoreToken.pauses,
      fcAccuracy: scoreToken.fcAccuracy * 100,
      fullCombo: scoreToken.fullCombo,
      handAccuracy: {
        left: scoreToken.accLeft,
        right: scoreToken.accRight,
      },
      timestamp: new Date(Number(scoreToken.timeset) * 1000),
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

    data.savedReplay = await this.saveReplay(scoreToken, data, player, isTop50GlobalScore);

    // Check if score already exists
    const existingScore = await BeatLeaderScoreModel.findOne({
      scoreId: scoreToken.id,
    }).lean();

    if (existingScore) {
      return beatLeaderScoreToObject(existingScore);
    }

    await BeatLeaderScoreModel.create({
      ...data,
      _id: new mongoose.Types.ObjectId(), // Generate a new _id
    });
    Logger.info(`Tracked BeatLeader score "${scoreToken.id}" for "${player.name}"(${playerId})`);
    return data;
  }

  /**
   * Gets the score stats for a score id.
   *
   * @param scoreId the id of the score
   */
  public static async getScoreStats(scoreId: number): Promise<ScoreStatsToken | undefined> {
    const scoreStatsFile = await StorageService.getFile(
      StorageBucket.BeatLeaderScoreStats,
      `${scoreId}.json`
    );
    if (scoreStatsFile != undefined) {
      return JSON.parse(scoreStatsFile.toString()) as ScoreStatsToken;
    }

    return this.saveScoreStats(scoreId);
  }

  /**
   * Saves the score stats for a score id.
   *
   * @param scoreId the id of the score
   * @returns the score stats, or undefined if nothing was found
   */
  public static async saveScoreStats(scoreId: number) {
    const scoreStats = await ApiServiceRegistry.getInstance()
      .getBeatLeaderService()
      .lookupScoreStats(scoreId);
    if (scoreStats == undefined) {
      return undefined;
    }
    await StorageService.saveFile(
      StorageBucket.BeatLeaderScoreStats,
      `${scoreId}.json`,
      Buffer.from(JSON.stringify(scoreStats))
    );
    return scoreStats;
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
      const currentStats = await this.getScoreStats(scoreId);
      if (!currentStats) {
        throw new NotFoundError(`Score stats not found for score ${scoreId}`);
      }
      return {
        current: currentStats,
        previous: undefined,
      };
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

  /**
   * Saves a replay to the storage.
   *
   * @param scoreToken the score token to save the replay for
   * @param data the data to save the replay for
   * @param player the player to save the replay for
   * @param isTop50GlobalScore whether the score is a top 50 global score
   * @returns whether the replay was saved
   */
  public static async saveReplay(
    scoreToken: BeatLeaderScoreToken,
    data: BeatLeaderScore,
    player: Player,
    isTop50GlobalScore: boolean
  ) {
    if (isProduction() && player && (player.trackReplays || isTop50GlobalScore)) {
      try {
        const replayId = getBeatLeaderReplayId(data);
        const replay = await Request.get<ArrayBuffer>(`https://cdn.replays.beatleader.xyz/${replayId}`, {
          returns: "arraybuffer",
        });

        if (replay !== undefined) {
          await StorageService.saveFile(StorageBucket.BeatLeaderReplays, `${replayId}`, Buffer.from(replay));
          return true;
        }
      } catch (error) {
        sendEmbedToChannel(
          DiscordChannels.BACKEND_LOGS,
          createGenericEmbed("BeatLeader Replays", `Failed to save replay for ${scoreToken.id}: ${error}`)
        );
        Logger.error(`Failed to save replay for ${scoreToken.id}: ${error}`);
      }
    }
    return false;
  }
}
