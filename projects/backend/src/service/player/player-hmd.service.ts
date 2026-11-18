import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { PlayerStatisticsService } from "../player-statistics/player-statistics.service";

export class PlayerHmdService {
  /**
   * Gets the hmd usage from the current day.
   *
   * @returns the hmd usage
   */
  public static async getActiveHmdUsage() {
    const rows = await ScoreSaberAccountsRepository.selectHmdCountsActiveAccounts();

    return Object.fromEntries(rows.map(r => [r.hmd as string, r.c]));
  }

  /**
   * Gets the player's HMD breakdown.
   *
   * @param playerId the player's id
   * @param realmId the realm the player's statistics are resolved for
   * @returns the player's HMD breakdown
   */
  public static async getPlayerHmdBreakdown(playerId: string, realmId: number) {
    const { hmdBreakdown } = await PlayerStatisticsService.getScoreStats(playerId, realmId);
    return hmdBreakdown;
  }
}
