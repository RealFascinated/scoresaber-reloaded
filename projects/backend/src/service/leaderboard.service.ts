import { Leaderboards } from "@ssr/common/leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { SSRCache } from "@ssr/common/cache";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import Leaderboard from "@ssr/common/leaderboard/leaderboard";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";
import { NotFoundError } from "elysia";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import BeatSaverService from "./beatsaver.service";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/beatsaver-map";

const leaderboardCache = new SSRCache({
  ttl: 1000 * 60 * 60 * 24,
});

export default class LeaderboardService {
  /**
   * Gets the leaderboard.
   *
   * @param leaderboard the leaderboard
   * @param id the id
   */
  private static async getLeaderboardToken<T>(leaderboard: Leaderboards, id: string): Promise<T | undefined> {
    const cacheKey = `${leaderboard}-${id}`;
    if (leaderboardCache.has(cacheKey)) {
      return leaderboardCache.get(cacheKey) as T;
    }

    switch (leaderboard) {
      case "scoresaber": {
        const leaderboard = (await scoresaberService.lookupLeaderboard(id)) as T;
        leaderboardCache.set(cacheKey, leaderboard);
        return leaderboard;
      }
      default: {
        return undefined;
      }
    }
  }

  /**
   * Gets a leaderboard.
   *
   * @param leaderboardName the leaderboard to get
   * @param id the players id
   * @returns the scores
   */
  public static async getLeaderboard(
    leaderboardName: Leaderboards,
    id: string
  ): Promise<LeaderboardResponse<Leaderboard>> {
    let leaderboard: Leaderboard | undefined;
    let beatSaverMap: BeatSaverMap | undefined;

    switch (leaderboardName) {
      case "scoresaber": {
        const leaderboardToken = await LeaderboardService.getLeaderboardToken<ScoreSaberLeaderboardToken>(
          leaderboardName,
          id
        );
        if (leaderboardToken == undefined) {
          throw new NotFoundError(`Leaderboard not found for "${id}"`);
        }
        leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
        beatSaverMap = await BeatSaverService.getMap(leaderboard.songHash);
        break;
      }
      default: {
        throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
      }
    }

    return {
      leaderboard: leaderboard,
      beatsaver: beatSaverMap,
    };
  }
}
