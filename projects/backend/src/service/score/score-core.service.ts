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
        // Atomic replace: snapshots the previous PB to history and upserts the
        // new row in one transaction, with the newest play winning under
        // concurrent writes (see ScoreSaberScoresRepository.replaceScore).
        const inserted = await ScoreSaberScoresRepository.replaceScore(insertRow);
        if (!inserted) {
          return { score: undefined, hasPreviousScore, tracked: false };
        }
      } else {
        await ScoreSaberScoreHistoryRepository.insertAttempt(insertRow, playerId, leaderboard.id);
        return { score: undefined, hasPreviousScore: true, tracked: true };
      }
    } else {
      const inserted = await ScoreSaberScoresRepository.insertScore(insertRow);
      if (!inserted) {
        // Either a concurrent writer already recorded this scoreId (fine), or it
        // took the (playerId, leaderboardId) slot with a different score — keep
        // this play in history so it is not lost entirely.
        if (!(await ScoreSaberScoresRepository.rowExistsByScoreId(insertRow.scoreId))) {
          await ScoreSaberScoreHistoryRepository.insertAttempt(insertRow, playerId, leaderboard.id);
        }
        return { score: undefined, hasPreviousScore, tracked: false };
      }
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
   * Upserts scores fetched from the ScoreSaber API into the database.
   *
   * Fire-and-forget safe: this never throws, so callers can invoke it without
   * awaiting (e.g. `void ScoreCoreService.upsertScoresFromApi(scores)`) without
   * blocking the API response. New scores are inserted; scores that already exist
   * (same scoreId) only have their `pp` refreshed when it differs. If the bulk
   * upsert hits a row that violates the per-player-per-leaderboard unique
   * constraint (an older attempt on a map the player already has a current row
   * for), it falls back to upserting each score individually so a single stale
   * score cannot block the rest.
   *
   * @param scores the scores to upsert
   */
  public static async upsertScoresFromApi(scores: ScoreSaberScore[]): Promise<void> {
    const insertRows: ScoreSaberScoreInsertRow[] = [];
    try {
      const seenScoreIds = new Set<number>();
      const seenPlayerLeaderboards = new Set<string>();
      for (const score of scores) {
        const row = ScoreCoreService.toInsertRow(score);
        const playerLeaderboardKey = `${row.playerId}:${row.leaderboardId}`;
        if (seenScoreIds.has(row.scoreId) || seenPlayerLeaderboards.has(playerLeaderboardKey)) {
          continue;
        }
        seenScoreIds.add(row.scoreId);
        seenPlayerLeaderboards.add(playerLeaderboardKey);
        insertRows.push(row);
      }
    } catch (error) {
      ScoreCoreService.logger.warn(`Failed to prepare score upserts:`, error);
      return;
    }

    if (insertRows.length === 0) {
      return;
    }

    try {
      await ScoreSaberScoresRepository.upsertScores(insertRows);
    } catch (error) {
      ScoreCoreService.logger.debug(
        `Bulk score upsert for %d score(s) failed, retrying per score: %s`,
        insertRows.length,
        (error as Error).message
      );
      await Promise.allSettled(
        insertRows.map(row =>
          ScoreSaberScoresRepository.upsertScores([row]).catch(error =>
            ScoreCoreService.logger.debug(
              `Failed to upsert score "%s" for player "%s": %s`,
              row.scoreId,
              row.playerId,
              (error as Error).message
            )
          )
        )
      );
    }
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
