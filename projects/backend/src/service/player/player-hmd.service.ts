import { HMD } from "@ssr/common/hmds";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberAccountsTable, scoreSaberScoresTable } from "../../db/schema";

import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerCoreService } from "./player-core.service";

export class PlayerHmdService {
  /**
   * Updates the player's HMD.
   *
   * @param playerId the player's id
   * @param hmd the player's HMD
   */
  public static async updatePlayerHmd(playerId: string, score: ScoreSaberScore): Promise<void> {
    await PlayerCoreService.updatePlayer(playerId, { hmd: score.hmd });
  }

  /**
   * Gets the hmd usage from the current day.
   *
   * @returns the hmd usage
   */
  public static async getActiveHmdUsage(): Promise<Record<string, number>> {
    const rows = await db
      .select({
        hmd: scoreSaberAccountsTable.hmd,
        c: count(),
      })
      .from(scoreSaberAccountsTable)
      .where(and(isNotNull(scoreSaberAccountsTable.hmd), eq(scoreSaberAccountsTable.inactive, false)))
      .groupBy(scoreSaberAccountsTable.hmd);

    return Object.fromEntries(rows.map(r => [r.hmd as string, r.c]));
  }

  /**
   * Gets the player's HMD breakdown.
   *
   * @param playerId the player's id
   * @param limit the limit of scores to get
   * @returns the player's HMD breakdown
   */
  public static async getPlayerHmdBreakdown(playerId: string, limit?: number): Promise<Record<HMD, number>> {
    const rows =
      limit != null
        ? await db
          .select({ hmd: scoreSaberScoresTable.hmd })
          .from(scoreSaberScoresTable)
          .where(eq(scoreSaberScoresTable.playerId, playerId))
          .limit(limit)
        : await db
          .select({ hmd: scoreSaberScoresTable.hmd })
          .from(scoreSaberScoresTable)
          .where(eq(scoreSaberScoresTable.playerId, playerId));

    const counts = new Map<HMD, number>();
    for (const row of rows) {
      const hmd = row.hmd;
      counts.set(hmd, (counts.get(hmd) ?? 0) + 1);
    }

    return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])) as Record<HMD, number>;
  }
}
