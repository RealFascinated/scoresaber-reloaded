import Logger from "@ssr/common/logger";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoreHistoryTable, scoreSaberScoresTable } from "../../db/schema";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { PlayerCoreService } from "../player/player-core.service";
import { PlayerHmdService } from "../player/player-hmd.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
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
    beatLeaderScore: BeatLeaderScore | undefined,
    leaderboard: ScoreSaberLeaderboard,
    newScore: boolean = false
  ): Promise<{
    score: ScoreSaberScore | undefined;
    hasPreviousScore: boolean;
    tracked: boolean;
  }> {
    const before = performance.now();

    const playerId = score.playerId;
    let isImprovement = false;
    if (newScore) {
      // Ensure the score is not already tracked (same scoreId and score)
      const scoreExists = await db
        .select()
        .from(scoreSaberScoresTable)
        .where(
          and(eq(scoreSaberScoresTable.scoreId, score.scoreId), eq(scoreSaberScoresTable.score, score.score))
        )
        .limit(1);
      if (scoreExists.length > 0) {
        return { score: undefined, hasPreviousScore: false, tracked: false };
      }

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

    await PlayerHmdService.updatePlayerHmd(playerId, score);

    // Handle score for medal updates
    if (leaderboard.ranked && score.rank <= 10) {
      await MedalScoresService.handleIncomingMedalsScoreUpdate(score, beatLeaderScore);
    }

    // Update player score stats
    const scoreStats = await PlayerCoreService.getPlayerScoreStats(playerId);
    await PlayerCoreService.updatePlayer(playerId, { scoreStats });

    const modifiers = score.modifiers.map(modifier => modifier.toString());
    const inserted = await db
      .insert(scoreSaberScoresTable)
      .values({
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
      })
      .onConflictDoNothing({ target: scoreSaberScoresTable.scoreId })
      .returning({ scoreId: scoreSaberScoresTable.scoreId });

    if (inserted.length === 0) {
      Logger.warn(`Score insert skipped for scoreId "%s" (conflict)`, score.scoreId);
      return { score: undefined, hasPreviousScore: false, tracked: false };
    }

    // todo: update player hmd, handle medal updates, update player score stats

    if (newScore) {
      Logger.info(
        `Tracked %s ScoreSaber score "%s" for "%s" on "%s" [%s / %s]%s in %s`,
        newScore ? "New" : "Missing",
        score.scoreId,
        playerId,
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
