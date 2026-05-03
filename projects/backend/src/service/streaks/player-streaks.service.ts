import Logger, { ScopedLogger } from "@ssr/common/logger";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration } from "@ssr/common/utils/time-utils";
import dayjs from "dayjs";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";

export class PlayerPlayedStreakService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player Streak");

  private static readonly expireBrokenStreaksMaxAttempts = 4;

  private static isPgDeadlock(e: unknown): boolean {
    return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "40P01";
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handles the score and updates the player's streak.
   *
   * @param score the score to handle
   */
  public static async handleScoreSaberScore(score: ScoreSaberScore): Promise<void> {
    const player = await ScoreSaberAccountsRepository.findRowById(score.playerId);
    if (!player) {
      return;
    }

    const today = dayjs().format("YYYY-MM-DD");
    if (player.lastPlayedDate === today) {
      return;
    }

    const previousStreak = player.currentStreak;
    player.currentStreak++;
    if (player.currentStreak > player.longestStreak) {
      player.longestStreak = player.currentStreak;
    }
    player.lastPlayedDate = today;
    await ScoreSaberAccountsRepository.updateAccount(player.id, {
      currentStreak: player.currentStreak,
      longestStreak: player.longestStreak,
      lastPlayedDate: today,
    });
    PlayerPlayedStreakService.logger.info(
      `Player ${player.id} streak updated: current ${previousStreak} -> ${player.currentStreak}, longest ${player.longestStreak}`
    );
  }

  /**
   * Expires broken streaks.
   *
   * Retries on deadlock: the bulk UPDATE can overlap concurrent row updates on this table (e.g. streak bumps from score ingestion).
   */
  public static async expireBrokenStreaks(): Promise<void> {
    for (let attempt = 1; attempt <= PlayerPlayedStreakService.expireBrokenStreaksMaxAttempts; attempt++) {
      try {
        const before = performance.now();
        const result = await db.execute(sql`
          UPDATE "scoresaber-accounts"
          SET "currentStreak" = 0
          WHERE "currentStreak" > 0
            AND "lastPlayedDate" IS NOT NULL
            AND "lastPlayedDate" < (CURRENT_DATE - INTERVAL '1 day')::date
        `);
        PlayerPlayedStreakService.logger.info(
          `Expired ${result.rowCount} broken streaks in ${formatDuration(performance.now() - before)}`
        );
        return;
      } catch (e: unknown) {
        if (
          attempt < PlayerPlayedStreakService.expireBrokenStreaksMaxAttempts &&
          PlayerPlayedStreakService.isPgDeadlock(e)
        ) {
          await PlayerPlayedStreakService.delay(50 * 2 ** (attempt - 1));
          continue;
        }
        throw e;
      }
    }
  }
}
