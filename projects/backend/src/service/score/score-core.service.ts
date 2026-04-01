import Logger from "@ssr/common/logger";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { ScoreSaberAccountRow, scoreSaberScoreHistoryTable, scoreSaberScoresTable } from "../../db/schema";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { PlayerCoreService } from "../player/player-core.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import { MedalScoresService } from "./medal-scores.service";

type InsertScoreDataOptions = {
  insertBeatLeaderScore?: boolean;
  insertPreviousScore?: boolean;
  insertPlayerInfo?: boolean;
};

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
    beatLeaderScore: BeatLeaderScore | undefined,
    leaderboard: ScoreSaberLeaderboard,
    newScore: boolean = false
  ): Promise<{
    score: ScoreSaberScore | undefined;
    hasPreviousScore: boolean;
    tracked: boolean;
  }> {
    const before = performance.now();

    // Ensure the score is not already tracked (same scoreId and score)
    const scoreExists = await db
      .select({ exists: sql`1` })
      .from(scoreSaberScoresTable)
      .where(
        and(eq(scoreSaberScoresTable.scoreId, score.scoreId), eq(scoreSaberScoresTable.score, score.score))
      )
      .limit(1);
    if (scoreExists.length > 0) {
      return { score: undefined, hasPreviousScore: false, tracked: false };
    }

    const playerId = score.playerId;
    let isImprovement = false;
    if (newScore) {
      const existingScore = await db
        .select()
        .from(scoreSaberScoresTable)
        .where(
          and(
            eq(scoreSaberScoresTable.playerId, playerId),
            eq(scoreSaberScoresTable.leaderboardId, leaderboard.id)
          )
        )
        .limit(1);

      isImprovement = existingScore.length > 0;
      if (isImprovement) {
        const previous = existingScore[0];

        // Move old score to history (snapshot the row being replaced, not the incoming score)
        await db
          .insert(scoreSaberScoreHistoryTable)
          .values({
            playerId: playerId,
            leaderboardId: leaderboard.id,
            scoreId: previous.scoreId,
            difficulty: previous.difficulty,
            characteristic: previous.characteristic,
            score: previous.score,
            accuracy: previous.accuracy,
            pp: previous.pp,
            missedNotes: previous.missedNotes,
            badCuts: previous.badCuts,
            maxCombo: previous.maxCombo,
            fullCombo: previous.fullCombo,
            modifiers: previous.modifiers?.length ? previous.modifiers : null,
            hmd: previous.hmd,
            rightController: previous.rightController,
            leftController: previous.leftController,
            timestamp: previous.timestamp,
          })
          .onConflictDoNothing({
            target: [
              scoreSaberScoreHistoryTable.leaderboardId,
              scoreSaberScoreHistoryTable.playerId,
              scoreSaberScoreHistoryTable.score,
            ],
          });

        // Delete from current
        await db.delete(scoreSaberScoresTable).where(eq(scoreSaberScoresTable.scoreId, previous.scoreId));
      }
    }

    const playerUpdates: Partial<ScoreSaberAccountRow> = {
      scoreStats: await PlayerCoreService.getPlayerScoreStats(playerId),
    };
    // We only want to update the player's HMD if the score is new
    if (newScore) {
      playerUpdates.hmd = score.hmd;
    }
    await PlayerCoreService.updatePlayer(playerId, playerUpdates);

    // Handle score for medal updates
    if (leaderboard.ranked && score.rank <= 10) {
      await MedalScoresService.handleIncomingMedalsScoreUpdate(score, beatLeaderScore);
    }

    const modifiers = score.modifiers.map(modifier => modifier.toString());
    const scoreUpsertSet: typeof scoreSaberScoresTable.$inferInsert = {
      scoreId: score.scoreId,
      playerId: playerId,
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
    };

    await db
      .insert(scoreSaberScoresTable)
      .values(scoreUpsertSet)
      .onConflictDoUpdate({
        target: scoreSaberScoresTable.scoreId,
        set: scoreUpsertSet,
      })
      .returning({ scoreId: scoreSaberScoresTable.scoreId });

    if (newScore) {
      Logger.info(
        `Tracked ScoreSaber score "%s" for "%s" on "%s" [%s / %s]%s in %s`,
        score.scoreId,
        score.playerInfo?.name ?? playerId,
        leaderboard.songName,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        isImprovement ? ` (improvement)` : "",
        formatDuration(performance.now() - before)
      );
    }
    return { score: score, hasPreviousScore: isImprovement, tracked: true };
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
          .select({ scoreId: scoreSaberScoresTable.scoreId })
          .from(scoreSaberScoresTable)
          .where(eq(scoreSaberScoresTable.scoreId, scoreId))
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
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberScore>;
  public static async insertScoreData(
    score: ScoreSaberMedalScore,
    leaderboard: ScoreSaberLeaderboard,
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberMedalScore>;
  public static async insertScoreData(
    score: ScoreSaberScore | ScoreSaberMedalScore,
    leaderboard: ScoreSaberLeaderboard,
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberScore | ScoreSaberMedalScore> {
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
      if (options?.insertBeatLeaderScore === false) {
        return undefined;
      }
      return BeatLeaderService.getBeatLeaderScoreFromSong(
        score.playerId,
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        score.score
      );
    }

    async function getPreviousScore() {
      if (options?.insertPreviousScore && leaderboard) {
        return PlayerScoreHistoryService.getPlayerPreviousScore(score, leaderboard);
      }
      return undefined;
    }

    async function getPlayerInfo() {
      if (options?.insertPlayerInfo) {
        return PlayerCoreService.getAccount(score.playerId);
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
