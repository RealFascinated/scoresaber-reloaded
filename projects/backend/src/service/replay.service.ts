import ky from "ky";
import { NotFoundError } from "../error/not-found-error";

const SCORESABER_REPLAY_ENDPOINT = "https://scoresaber.com/api/game/telemetry/downloadReplay";

export class ReplayService {
  /**
   * Gets the app statistics.
   */
  public static async getReplay(playerId: string, leaderboardId: string) {
    const response = await ky.get(SCORESABER_REPLAY_ENDPOINT, {
      searchParams: {
        playerId,
        leaderboardId,
      },
      headers: {
        "User-Agent": "ScoreSaber-PC/3.3.13",
      },
    });
    const replayData = await response.arrayBuffer();
    if (replayData === undefined) {
      throw new NotFoundError(`Replay for player "${playerId}" and leaderboard "${leaderboardId}" not found`);
    }

    return replayData;
  }
}
