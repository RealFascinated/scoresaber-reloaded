import { NotFoundError } from "@ssr/common/error/not-found-error";
import { getBeatLeaderReplayCdnUrl } from "@ssr/common/utils/beatleader-utils";
import BeatLeaderService from "../beatleader.service";

export class PlayerReplayService {
  /**
   * Gets the replay URL for a score.
   *
   * @param scoreId the score ID
   * @returns the replay URL
   */
  public static async getPlayerReplayUrl(scoreId: string): Promise<string> {
    const beatleaderScore = await BeatLeaderService.getAdditionalScoreData(
      parseInt(scoreId.replace(".bsor", ""))
    );
    if (!beatleaderScore) {
      throw new NotFoundError(`BeatLeader score "${scoreId}" not found`);
    }
    return getBeatLeaderReplayCdnUrl(beatleaderScore);
  }
}
