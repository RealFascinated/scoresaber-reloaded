import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberLeaderboardPlayerInfo } from "@ssr/common/schemas/scoresaber/leaderboard/player-info";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoreHistoryTable, scoreSaberScoresTable } from "../../db/schema";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import ScoreSaberService from "../scoresaber.service";

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
    player: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfo,
    newScore: boolean = false
  ): Promise<{
    score: ScoreSaberScore | undefined;
    hasPreviousScore: boolean;
    tracked: boolean;
  }> {
    const before = performance.now();

    // Ensure the score is not already tracked (same scoreId and score)
    const scoreExists = await db
      .select()
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.id, score.scoreId), eq(scoreSaberScoresTable.score, score.score)))
      .limit(1);
    if (scoreExists.length > 0) {
      return { score: undefined, hasPreviousScore: false, tracked: false };
    }

    const existingScore = await db
      .select()
      .from(scoreSaberScoresTable)
      .where(
        and(
          eq(scoreSaberScoresTable.playerId, player.id),
          eq(scoreSaberScoresTable.leaderboardId, leaderboard.id)
        )
      )
      .limit(1);

    const isImprovement = existingScore.length > 0;
    if (isImprovement) {
      const previous = existingScore[0];

      // Move old score to history
      await db.insert(scoreSaberScoreHistoryTable).values({
        playerId: player.id,
        leaderboardId: leaderboard.id,
        scoreId: previous.id,
        difficulty: score.difficulty,
        characteristic: score.characteristic,
        score: score.score,
        accuracy: score.accuracy,
        pp: score.pp,
        missedNotes: score.missedNotes,
        badCuts: score.badCuts,
        maxCombo: score.maxCombo,
        fullCombo: score.fullCombo,
        modifiers: score.modifiers.map(modifier => modifier.toString()),
        hmd: score.hmd,
        rightController: score.rightController,
        leftController: score.leftController,
        timestamp: score.timestamp,
      });

      // Delete from current
      await db.delete(scoreSaberScoresTable).where(eq(scoreSaberScoresTable.id, previous.id));
    }

    const modifiers = score.modifiers.map(modifier => modifier.toString());
    await db.insert(scoreSaberScoresTable).values({
      id: score.scoreId,
      playerId: player.id,
      leaderboardId: leaderboard.id,
      difficulty: score.difficulty,
      characteristic: score.characteristic,
      score: score.score,
      accuracy: score.accuracy,
      pp: score.pp,
      missedNotes: score.missedNotes,
      badCuts: score.badCuts,
      maxCombo: score.maxCombo,
      fullCombo: score.fullCombo,
      modifiers: modifiers.length > 0 ? modifiers : null,
      hmd: score.hmd,
      rightController: score.rightController,
      leftController: score.leftController,
      timestamp: score.timestamp,
    });

    // todo: update player hmd, handle medal updates, update player score stats

    if (newScore) {
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
    }
    return { score: score, hasPreviousScore: isImprovement, tracked: true };

    // const before = performance.now();

    // // Check if score exists and get previous score in parallel
    // const [scoreExists, previousScore] = await Promise.all([
    //   ScoreCoreService.scoreExists(score.scoreId, score.score),
    //   ScoreSaberScoreModel.findOne({
    //     playerId: player.id,
    //     leaderboardId: leaderboard.id,
    //   }).lean(),
    // ]);
    // const isImprovement = previousScore !== null && previousScore !== undefined;

    // // Skip saving the score if it already exists
    // if (scoreExists) {
    //   return { score: undefined, hasPreviousScore: isImprovement, tracked: false };
    // }

    // // Handle previous score if it exists
    // if (isImprovement) {
    //   // Delete the the old score
    //   await ScoreSaberScoreModel.deleteOne({ scoreId: previousScore.scoreId });

    //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //   // @ts-expect-error
    //   delete previousScore._id; // Remove _id to let a new one be generated

    //   await ScoreSaberPreviousScoreModel.create(previousScore);
    // }

    // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // // @ts-expect-error
    // delete score.playerInfo;

    // const scoreToCreate: ScoreSaberScore = {
    //   ...score,
    //   ...(beatLeaderScore?.scoreId ? { beatLeaderScoreId: beatLeaderScore?.scoreId } : {}),
    // };

    // await ScoreSaberScoreModel.create(scoreToCreate);
    // await PlayerHmdService.updatePlayerHmd(player.id, score);

    // // Handle score for medal updates
    // if (leaderboard.ranked && score.rank <= 10) {
    //   await MedalScoresService.handleIncomingMedalsScoreUpdate(score, beatLeaderScore);
    // }

    // // Update player score stats
    // const scoreStats = await PlayerCoreService.getPlayerScoreStats(player.id);
    // await PlayerCoreService.updatePlayer(player.id, { scoreStats });

    // if (newScore) {
    //   Logger.info(
    //     `Tracked %s ScoreSaber score "%s" for "%s" on "%s" [%s / %s]%s in %s`,
    //     newScore ? "New" : "Missing",
    //     score.scoreId,
    //     player.name,
    //     leaderboard.songName,
    //     leaderboard.difficulty.difficulty,
    //     leaderboard.difficulty.characteristic,
    //     isImprovement ? ` (improvement)` : "",
    //     formatDuration(performance.now() - before)
    //   );
    // }
    // return { score: score, hasPreviousScore: isImprovement, tracked: true };
  }

  /**
   * Checks if a ScoreSaber score already exists.
   *
   * @param scoreId the id of the score
   * @param score the score to check if it exists to do an exact match
   */
  public static async scoreExists(scoreId: number): Promise<boolean> {
    return (
      (
        await db
          .select({ scoreId: scoreSaberScoresTable.id })
          .from(scoreSaberScoresTable)
          .where(eq(scoreSaberScoresTable.id, scoreId))
          .limit(1)
      ).length > 0
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
    leaderboard: ScoreSaberLeaderboard,
    options?: {
      insertBeatLeaderScore?: boolean;
      insertPreviousScore?: boolean;
      insertPlayerInfo?: boolean;
    }
  ) {
    options = {
      insertBeatLeaderScore: true,
      insertPreviousScore: true,
      insertPlayerInfo: true,
      ...options,
    };

    leaderboard = !leaderboard
      ? await LeaderboardCoreService.getLeaderboard(score.leaderboardId)
      : leaderboard;

    // If the leaderboard is not found, return the plain score
    if (!leaderboard) {
      return score;
    }

    async function getBeatLeaderScore() {
      if (options?.insertBeatLeaderScore) {
        return BeatLeaderService.getBeatLeaderScoreFromSong(
          score.playerId,
          leaderboard.songHash,
          leaderboard.difficulty.difficulty,
          leaderboard.difficulty.characteristic,
          score.score
        );
      }
      return undefined;
    }

    async function getPreviousScore() {
      if (options?.insertPreviousScore && leaderboard) {
        return PlayerScoreHistoryService.getPlayerPreviousScore(score, leaderboard);
      }
      return undefined;
    }

    async function getPlayerInfo() {
      if (options?.insertPlayerInfo) {
        const playerToken = await ScoreSaberService.getCachedPlayer(score.playerId).catch(() => undefined);
        return await ScoreSaberService.getPlayer(score.playerId, "basic", playerToken);
      }
      return undefined;
    }

    const [beatLeaderScore, previousScore, playerInfo] = await Promise.all([
      getBeatLeaderScore(),
      getPreviousScore(),
      getPlayerInfo(),
    ]);

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
        profilePicture: playerInfo.avatar,
        country: playerInfo.country,
      };
    }

    return score;
  }
}
