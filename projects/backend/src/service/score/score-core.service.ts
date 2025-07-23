import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { scoreToObject } from "../../common/score/score.util";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { PlayerService } from "../player/player.service";
import ScoreSaberService from "../scoresaber.service";
import { ScoreService } from "./score.service";

export class ScoreCoreService {
  /**
   * Tracks ScoreSaber score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard for the score
   * @param player the player for the score
   * @param fastCreate skips some checks to speed up score insertion
   * @param log whether to log the score
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken,
    fastCreate: boolean = false,
    log: boolean = true
  ): Promise<{
    score: ScoreSaberScore | undefined;
    hasPreviousScore: boolean;
    tracked: boolean;
    updatedScore?: boolean;
  }> {
    const before = performance.now();

    // Skip saving the score if characteristic is missing
    if (!score.characteristic) {
      Logger.warn(
        `Skipping ScoreSaber score "${score.scoreId}" for "${player.name}"(${player.id}) due to missing characteristic: "${score.characteristic}"`
      );
      return { score: undefined, hasPreviousScore: false, tracked: false };
    }

    // Check if score exists and get previous score in parallel
    const [scoreExists, previousScore] = await Promise.all([
      ScoreService.scoreExists(player.id, leaderboard, score),
      !fastCreate
        ? ScoreSaberScoreModel.findOne({
            playerId: player.id,
            leaderboardId: leaderboard.id,
          })
        : undefined,
    ]);

    const isImprovement = previousScore !== null;

    if (scoreExists) {
      // If the score already exits, update the score. eg: pp, rank, etc.
      await ScoreSaberScoreModel.updateOne(
        {
          playerId: player.id,
          leaderboardId: leaderboard.id,
        },
        { $set: score }
      );

      return { score: undefined, hasPreviousScore: false, tracked: false, updatedScore: true };
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete score.playerInfo;

    // Handle previous score if it exists
    if (isImprovement && previousScore !== undefined) {
      await Promise.all([
        ScoreSaberScoreModel.deleteOne({
          playerId: player.id,
          leaderboardId: leaderboard.id,
        }),
        (async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, ...rest } = previousScore.toObject();
          await ScoreSaberPreviousScoreModel.create(rest);
        })(),
      ]);

      if (log) {
        Logger.info(
          `Archived previous score to history "${previousScore.scoreId}" for "${player.name}"(${player.id}) in ${(performance.now() - before).toFixed(0)}ms`
        );
      }
    }

    await Promise.all([
      ScoreSaberScoreModel.create(score),
      !fastCreate
        ? PlayerService.getPlayerMostCommonRecentHmd(player.id).then(hmd => {
            if (hmd) {
              return PlayerService.updatePlayerHmd(player.id, hmd);
            }
          })
        : undefined,
    ]);

    if (log) {
      Logger.info(
        `Tracked ScoreSaber score "${score.scoreId}" for "${player.name}"(${player.id})${isImprovement ? " (improvement)" : ""} in ${(performance.now() - before).toFixed(0)}ms`
      );
    }
    return { score: score, hasPreviousScore: isImprovement, tracked: true };
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
   * Inserts the score data into the score.
   *
   * @param score the score to insert data into
   * @param leaderboard the leaderboard to get the data from
   * @returns the score with the data inserted
   */
  public static async insertScoreData(
    score: ScoreSaberScore,
    leaderboard?: ScoreSaberLeaderboard,
    comparisonPlayer?: ScoreSaberPlayer,
    options?: {
      insertAdditionalData?: boolean;
      insertPreviousScore?: boolean;
      insertPlayerInfo?: boolean;
      isComparisonPlayerScore?: boolean;
      removeScoreWeight?: boolean;
    }
  ) {
    options = {
      insertAdditionalData: true,
      insertPreviousScore: true,
      insertPlayerInfo: true,
      isComparisonPlayerScore: false,
      removeScoreWeight: false,
      ...options,
    };

    leaderboard = !leaderboard
      ? (await LeaderboardService.getLeaderboard(score.leaderboardId + "")).leaderboard
      : leaderboard;

    // If the leaderboard is not found, return the plain score
    if (!leaderboard) {
      return score;
    }

    const [isScoreTracked, additionalData, previousScore, playerInfo, comparisonScore] =
      await Promise.all([
        ScoreService.scoreExists(score.playerId, leaderboard, score),
        options?.insertAdditionalData
          ? BeatLeaderService.getAdditionalScoreDataFromSong(
              score.playerId,
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic,
              score.score
            )
          : undefined,
        options?.insertPreviousScore
          ? PlayerService.getPlayerPreviousScore(
              score.playerId,
              score,
              leaderboard,
              score.timestamp
            )
          : undefined,
        options?.insertPlayerInfo
          ? (score.playerInfo ??
            (await ScoreSaberService.getCachedPlayer(score.playerId, true).catch(() => undefined)))
          : undefined,
        !options?.isComparisonPlayerScore && comparisonPlayer
          ? ScoreSaberScoreModel.findOne({
              playerId: comparisonPlayer.id,
              leaderboardId: leaderboard.id,
            }).lean()
          : undefined,
      ]);

    score.isTracked = isScoreTracked;

    if (additionalData !== undefined) {
      score.additionalData = additionalData;
    }

    if (previousScore !== undefined) {
      score.previousScore = previousScore;
    }

    if (playerInfo !== undefined) {
      score.playerInfo = {
        id: playerInfo.id,
        name: playerInfo.name,
        profilePicture: playerInfo.profilePicture,
        country: playerInfo.country,
      };
    }

    if (comparisonScore) {
      const rawComparisonScore = scoreToObject(comparisonScore as unknown as ScoreSaberScore);
      score.comparisonScore = await ScoreService.insertScoreData(
        rawComparisonScore,
        leaderboard,
        comparisonPlayer,
        {
          insertAdditionalData: options.insertAdditionalData,
          insertPreviousScore: options.insertPreviousScore,
          insertPlayerInfo: options.insertPlayerInfo,
          isComparisonPlayerScore: true,
        }
      );
    }

    if (options?.removeScoreWeight) {
      score.weight = undefined;
    }

    return score;
  }
}
