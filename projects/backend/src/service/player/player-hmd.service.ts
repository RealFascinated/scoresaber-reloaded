import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";

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
}
