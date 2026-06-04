import Logger, { type ScopedLogger } from "@ssr/common/logger";
import type { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { eq } from "drizzle-orm";
import { sendMedalScoreNotification } from "../../common/score/score.util";
import { db } from "../../db";
import type { ScoreSaberScoreRow } from "../../db/schema";
import { scoreSaberAccountsTable } from "../../db/schema";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import {
  ScoreSaberScoresRepository,
  type ScoreSaberScoreInsertRow,
} from "../../repositories/scoresaber-scores.repository";
import BeatLeaderService from "../beatleader/beatleader.service";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { PlayerMedalsService } from "../medals/player-medals.service";
import { PlayerCoreService } from "../player/player-core.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";

type InsertScoreDataOptions = {
  insertBeatLeaderScore?: boolean;
  insertPreviousScore?: boolean;
  insertPlayerInfo?: boolean;
};

export class ScoreCoreService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Score Core");

  /**
   * Tracks ScoreSaber score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard for the score
   * @param newScore whether the score was just set (live websocket)
   * @param beatLeaderScore optional BeatLeader replay link for Discord medal notifications
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    newScore: boolean = false,
    beatLeaderScore?: BeatLeaderScore,
    options?: {
      skipDuplicateCheck?: boolean;
    }
  ): Promise<{
    score: ScoreSaberScore | undefined;
    hasPreviousScore: boolean;
    tracked: boolean;
  }> {
    const before = performance.now();

    if (
      !options?.skipDuplicateCheck &&
      (await ScoreSaberScoresRepository.existsByScoreIdAndScore(score.scoreId, score.score))
    ) {
      return { score: undefined, hasPreviousScore: false, tracked: false };
    }

    if (await ScoreSaberScoresRepository.rowExistsByScoreId(score.scoreId)) {
      return { score: undefined, hasPreviousScore: false, tracked: false };
    }

    const playerId = score.playerId;
    const currentRow = await ScoreSaberScoresRepository.findByPlayerAndLeaderboard(playerId, leaderboard.id);

    let hasPreviousScore = false;
    const insertRow = ScoreCoreService.toInsertRow(score);

    if (currentRow && currentRow.scoreId !== score.scoreId) {
      hasPreviousScore = true;
      const shouldReplaceCurrent =
        newScore || ScoreCoreService.shouldIncomingReplaceCurrent(score, currentRow);

      if (shouldReplaceCurrent) {
        await ScoreSaberScoreHistoryRepository.insertSnapshot(currentRow, playerId, leaderboard.id);
        await ScoreSaberScoresRepository.deleteByScoreId(currentRow.scoreId);
      } else {
        await ScoreSaberScoreHistoryRepository.insertAttempt(insertRow, playerId, leaderboard.id);
        return { score: undefined, hasPreviousScore: true, tracked: true };
      }
    }

    const inserted = await ScoreSaberScoresRepository.insertScore(insertRow);
    if (!inserted) {
      return { score: undefined, hasPreviousScore, tracked: false };
    }

    if (newScore) {
      await PlayerCoreService.updatePlayer(playerId, { hmd: score.hmd });
    }

    if (newScore && leaderboard.ranked && score.rank <= 10) {
      const medalChanges = await PlayerMedalsService.refreshLeaderboardMedals(leaderboard);
      if (medalChanges.size > 0) {
        await sendMedalScoreNotification(score, leaderboard, beatLeaderScore, medalChanges);
      }
    }

    if (newScore) {
      ScoreCoreService.logger.info(
        `Tracked ScoreSaber score "%s" for "%s" on "%s" [%s / %s]%s in %s`,
        score.scoreId,
        score.playerInfo?.name ?? playerId,
        leaderboard.songName,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        hasPreviousScore ? ` (improvement)` : "",
        formatDuration(performance.now() - before)
      );
    }
    return { score: score, hasPreviousScore, tracked: true };
  }

  /**
   * Whether an ingested score should replace the stored current PB (sync/backfill paths).
   */
  private static shouldIncomingReplaceCurrent(
    incoming: ScoreSaberScore,
    current: ScoreSaberScoreRow
  ): boolean {
    if (incoming.timestamp.getTime() > current.timestamp.getTime()) {
      return true;
    }
    if (incoming.timestamp.getTime() < current.timestamp.getTime()) {
      return false;
    }
    if (incoming.score > current.score) {
      return true;
    }
    if (incoming.score < current.score) {
      return false;
    }
    return incoming.pp > current.pp;
  }

  public static toInsertRow(score: ScoreSaberScore): ScoreSaberScoreInsertRow {
    const modifiers = score.modifiers.map(modifier => modifier.toString());
    return {
      scoreId: score.scoreId,
      playerId: score.playerId,
      leaderboardId: score.leaderboardId,
      difficulty: score.difficulty,
      characteristic: score.characteristic,
      score: score.score,
      accuracy: score.accuracy,
      pp: score.pp,
      medals: 0,
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
      ? await ScoreSaberLeaderboardsService.getLeaderboard(score.leaderboardId)
      : leaderboard;

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
        const [row] = await db
          .select({
            id: scoreSaberAccountsTable.id,
            name: scoreSaberAccountsTable.name,
            country: scoreSaberAccountsTable.country,
            avatar: scoreSaberAccountsTable.avatar,
          })
          .from(scoreSaberAccountsTable)
          .where(eq(scoreSaberAccountsTable.id, score.playerId));

        return row;
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
        avatar: playerInfo.avatar,
        country: playerInfo.country ?? undefined,
      };
    }

    return score;
  }
}
