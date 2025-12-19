import Logger from "@ssr/common/logger";
import { BeatLeaderScore } from "@ssr/common/model/beatleader-score/beatleader-score";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { scoreToObject } from "@ssr/common/utils/model-converters";
import { formatDuration } from "@ssr/common/utils/time-utils";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { PlayerHmdService } from "../player/player-hmd.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import ScoreSaberService from "../scoresaber.service";
import { MedalScoresService } from "./medal-scores.service";

export class ScoreCoreService {
  /**
   * Tracks ScoreSaber score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard for the score
   * @param player the player for the score
   * @param newScore whether the score was just set
   * @param log whether to log the score
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken,
    beatLeaderScore?: BeatLeaderScore,
    newScore: boolean = false
  ): Promise<{
    score: ScoreSaberScore | undefined;
    hasPreviousScore: boolean;
    tracked: boolean;
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
      ScoreCoreService.scoreExists(score.scoreId, score.score),
      ScoreSaberScoreModel.findOne({
        playerId: player.id,
        leaderboardId: leaderboard.id,
      }).lean(),
    ]);
    const isImprovement = previousScore !== null && previousScore !== undefined;

    // Skip saving the score if it already exists
    if (scoreExists) {
      return { score: undefined, hasPreviousScore: isImprovement, tracked: false };
    }

    // Handle previous score if it exists
    if (isImprovement) {
      // Delete the the old score
      await ScoreSaberScoreModel.deleteOne({ scoreId: previousScore.scoreId });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      delete previousScore._id; // Remove _id to let a new one be generated
      await ScoreSaberPreviousScoreModel.create(previousScore);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete score.playerInfo;

    await ScoreSaberScoreModel.create(score);
    await PlayerHmdService.updatePlayerHmd(player.id);

    // Handle score for medal updates
    if (leaderboard.ranked && score.rank <= 10) {
      await MedalScoresService.handleIncomingMedalsScoreUpdate(score, beatLeaderScore);
    }

    Logger.info(
      `Tracked %s ScoreSaber score "%s" for "%s" on "%s" [%s / %s]%s in %s`,
      newScore ? "New" : "Missing",
      score.scoreId,
      player.name,
      leaderboard.songName,
      leaderboard.difficulty.difficulty,
      leaderboard.difficulty.characteristic,
      isImprovement ? ` (improvement)` : "",
      formatDuration(performance.now() - before)
    );
    return { score: score, hasPreviousScore: isImprovement, tracked: true };
  }

  /**
   * Checks if a ScoreSaber score already exists.
   *
   * @param scoreId the id of the score
   * @param score the score to check if it exists to do an exact match
   */
  public static async scoreExists(scoreId: string | number, score?: number): Promise<boolean> {
    return (
      (await ScoreSaberScoreModel.exists({
        scoreId: String(scoreId),
        ...(score ? { score } : {}),
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
    options?: {
      comparisonPlayer?: ScoreSaberPlayer;
      insertBeatLeaderScore?: boolean;
      insertPreviousScore?: boolean;
      insertPlayerInfo?: boolean;
      isComparisonPlayerScore?: boolean;
      removeScoreWeightAndRank?: boolean;
    }
  ) {
    options = {
      insertBeatLeaderScore: true,
      insertPreviousScore: true,
      insertPlayerInfo: true,
      isComparisonPlayerScore: false,
      removeScoreWeightAndRank: false,
      ...options,
    };

    leaderboard = !leaderboard
      ? (await LeaderboardCoreService.getLeaderboard(score.leaderboardId)).leaderboard
      : leaderboard;

    // If the leaderboard is not found, return the plain score
    if (!leaderboard) {
      return score;
    }

    const [isScoreTracked, beatLeaderScore, previousScore, playerInfo, comparisonScore] =
      await Promise.all([
        ScoreCoreService.scoreExists(score.scoreId),
        options?.insertBeatLeaderScore
          ? BeatLeaderService.getBeatLeaderScoreFromSong(
              score.playerId,
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic,
              score.score
            )
          : undefined,
        options?.insertPreviousScore
          ? PlayerScoreHistoryService.getPlayerPreviousScore(
              score.playerId,
              score,
              leaderboard,
              score.timestamp
            )
          : undefined,
        options?.insertPlayerInfo
          ? (score.playerInfo ??
            (await ScoreSaberService.getCachedPlayer(score.playerId).catch(() => undefined)))
          : undefined,
        !options?.isComparisonPlayerScore && options?.comparisonPlayer
          ? ScoreSaberScoreModel.findOne({
              playerId: options.comparisonPlayer!.id,
              leaderboardId: leaderboard.id,
            }).lean()
          : undefined,
      ]);

    score.isTracked = isScoreTracked;

    if (beatLeaderScore !== undefined) {
      score.beatLeaderScore = beatLeaderScore;
    }

    if (previousScore !== undefined) {
      score.previousScore = previousScore;
    }

    if (playerInfo !== undefined) {
      score.playerInfo = {
        id: playerInfo.id,
        name: playerInfo.name,
        profilePicture:
          playerInfo.profilePicture ?? "https://cdn.fascinated.cc/assets/oculus-avatar.jpg",
        country: playerInfo.country,
      };
    }

    if (comparisonScore) {
      score.comparisonScore = await ScoreCoreService.insertScoreData(
        scoreToObject(comparisonScore as unknown as ScoreSaberScore),
        leaderboard,
        {
          comparisonPlayer: options.comparisonPlayer,
          insertBeatLeaderScore: options.insertBeatLeaderScore,
          insertPreviousScore: options.insertPreviousScore,
          insertPlayerInfo: options.insertPlayerInfo,
          isComparisonPlayerScore: true,
        }
      );
    }

    if (options?.removeScoreWeightAndRank) {
      score.weight = undefined;
      score.rank = -1;
    }

    return score;
  }
}
