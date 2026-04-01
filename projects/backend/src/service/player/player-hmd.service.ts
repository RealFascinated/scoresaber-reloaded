import { HMD } from "@ssr/common/hmds";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";

export class PlayerHmdService {
  /**
   * Gets the hmd usage from the current day.
   *
   * @returns the hmd usage
   */
  public static async getActiveHmdUsage(): Promise<Record<string, number>> {
    const rows = await ScoreSaberAccountsRepository.selectHmdCountsActiveAccounts();

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
    const rows = await ScoreSaberScoresRepository.selectHmdByPlayerId(playerId, limit);

    const counts = new Map<HMD, number>();
    for (const row of rows) {
      const hmd = row.hmd;
      counts.set(hmd, (counts.get(hmd) ?? 0) + 1);
    }

    return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])) as Record<HMD, number>;
  }
}
