import type { HMD } from "@ssr/common/schemas/hmd";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import CacheService, { CacheId } from "../infra/cache.service";

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
    return CacheService.fetch(CacheId.PLAYER_HMD_BREAKDOWN, playerId, async () => {
      const rows = await ScoreSaberScoresRepository.getHmdCountsByPlayerId(playerId, limit);

      return Object.fromEntries(
        rows.sort((a, b) => b.count - a.count).map(row => [row.hmd, row.count])
      ) as Record<HMD, number>;
    });
  }
}
