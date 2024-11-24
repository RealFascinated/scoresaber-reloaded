import {
  AdditionalScoreData,
  AdditionalScoreDataDocument,
  AdditionalScoreDataModel,
} from "@ssr/common/model/additional-score-data/additional-score-data";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { BeatLeaderScoreImprovementToken } from "@ssr/common/types/token/beatleader/score/score-improvement";
import MinioService from "./minio.service";
import { MinioBucket } from "@ssr/common/minio-buckets";
import { beatLeaderService } from "@ssr/common/service/impl/beatleader";
import { isProduction, kyFetchBuffer } from "@ssr/common/utils/utils";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import { ScoreStatsDocument, ScoreStatsModel } from "@ssr/common/model/score-stats/score-stats";
import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";

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
  public static async getAdditionalScoreData(
    playerId: string,
    songHash: string,
    songDifficulty: string,
    songScore: number
  ): Promise<AdditionalScoreDataDocument | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.AdditionalScoreData),
      `additional-score-data:${playerId}-${songHash}-${songDifficulty}-${songScore}`,
      async () => {
        const additionalData = await AdditionalScoreDataModel.findOne({
          playerId: playerId,
          songHash: songHash.toUpperCase(),
          songDifficulty: songDifficulty,
          songScore: songScore,
        });
        if (!additionalData) {
          return undefined;
        }
        return additionalData;
      }
    );
  }

  /**
   * Checks if a player has additional score data for a song.
   *
   * @param playerId the id of the player
   * @param songHash the hash of the map
   * @param songDifficulty the difficulty of the map
   * @param songScore the score of the play
   * @private
   */
  public static async hasAdditionalScoreData(
    playerId: string,
    songHash: string,
    songDifficulty: string,
    songScore: number
  ) {
    return !!(await AdditionalScoreDataModel.exists({
      playerId: playerId,
      songHash: songHash.toUpperCase(),
      songDifficulty: songDifficulty,
      songScore: songScore,
    }));
  }

  /**
   * Tracks BeatLeader score.
   *
   * @param score the score to track
   */
  public static async trackBeatLeaderScore(score: BeatLeaderScoreToken) {
    const before = Date.now();
    const { playerId, player: scorePlayer, leaderboard } = score;

    // The score has already been tracked, so ignore it.
    if (
      await BeatLeaderService.hasAdditionalScoreData(
        playerId,
        leaderboard.song.hash,
        leaderboard.difficulty.difficultyName,
        score.baseScore
      )
    ) {
      return;
    }

    const scoreStats = await beatLeaderService.lookupScoreStats(score.id);
    if (scoreStats) {
      await this.trackScoreStats(score.id, scoreStats);
    }

    // Only save replays in production
    let savedReplayId: string | undefined;
    if (isProduction()) {
      const player: PlayerDocument | null = await PlayerModel.findById(playerId);

      // Cache replay for this score
      if (player && player.trackReplays) {
        try {
          const replayId = `${score.id}-${playerId}-${leaderboard.difficulty.difficultyName}-${leaderboard.difficulty.modeName}-${leaderboard.song.hash.toUpperCase()}.bsor`;
          const replayData = await kyFetchBuffer(`https://cdn.replays.beatleader.xyz/${replayId}`);

          if (replayData !== undefined) {
            await MinioService.saveFile(MinioBucket.BeatLeaderReplays, `${replayId}`, Buffer.from(replayData));
            savedReplayId = replayId;
          }
        } catch (error) {
          console.error(`Failed to save replay for ${score.id}: ${error}`);
        }

        // Remove old replays
        await this.cleanupScoreReplays(playerId, leaderboard.id);
      }
    }

    const getMisses = (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) => {
      return score.missedNotes + score.badCuts + score.bombCuts;
    };

    const difficulty = leaderboard.difficulty;
    const difficultyKey = `${difficulty.difficultyName}-${difficulty.modeName}`;
    const rawScoreImprovement = score.scoreImprovement;
    const data = {
      playerId: playerId,
      songHash: leaderboard.song.hash.toUpperCase(),
      songDifficulty: difficultyKey,
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
      scoreStats: isProduction() ? await beatLeaderService.lookupScoreStats(score.id) : undefined,
      cachedReplayId: savedReplayId,
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

    await AdditionalScoreDataModel.create(data);

    console.log(
      `Tracked additional score data for "${scorePlayer.name}"(${playerId}), difficulty: ${difficultyKey}, score: ${score.baseScore} in ${Date.now() - before}ms`
    );
  }

  /**
   * Cleans up the score replays for a player.
   *
   * @param playerId the player id to clean up
   * @param leaderboardId the leaderboard to clean up for the player
   */
  public static async cleanupScoreReplays(playerId: string, leaderboardId: string) {
    // todo: check premium status of the user and keep all replays.
    const scores = await AdditionalScoreDataModel.find({ playerId: playerId, leaderboardId: leaderboardId })
      .sort({
        timestamp: -1,
      })
      .skip(3); // Store last 3 replays.

    if (scores == null || scores.length == 0) {
      return;
    }

    for (const score of scores) {
      if (score.cachedReplayId == undefined) {
        return;
      }
      try {
        await MinioService.deleteFile(MinioBucket.BeatLeaderReplays, score.cachedReplayId);
        score.cachedReplayId = undefined;
        await score.save();
      } catch (error) {
        console.error(`Failed to delete replay for ${score.cachedReplayId}`, error);
      }
    }
  }

  /*
   * Track score stats.
   *
   * @param scoreId the id of the score
   * @param scoreStats the stats to track
   */
  private static async trackScoreStats(scoreId: number, scoreStats: ScoreStatsToken): Promise<ScoreStatsDocument> {
    return await ScoreStatsModel.create({
      _id: scoreId,
      hitTracker: scoreStats.hitTracker,
      accuracyTracker: scoreStats.accuracyTracker,
      winTracker: scoreStats.winTracker,
      scoreGraphTracker: scoreStats.scoreGraphTracker,
    });
  }

  /**
   * Gets the score stats for a score id.
   *
   * @param scoreId the id of the score
   */
  public static async getScoreStats(scoreId: number): Promise<ScoreStatsToken | undefined> {
    const scoreStats = await ScoreStatsModel.findOne({ _id: scoreId });
    if (scoreStats == null) {
      const scoreStats = await beatLeaderService.lookupScoreStats(scoreId);
      if (scoreStats) {
        return (await this.trackScoreStats(scoreId, scoreStats)).toObject();
      }
    }

    if (scoreStats == null) {
      return undefined;
    }
    return scoreStats.toObject();
  }
}
