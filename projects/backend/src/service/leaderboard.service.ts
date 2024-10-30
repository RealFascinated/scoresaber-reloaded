import { Leaderboards } from "@ssr/common/leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";
import { NotFoundError } from "elysia";
import BeatSaverService from "./beatsaver.service";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Leaderboard from "@ssr/common/model/leaderboard/leaderboard";

export default class LeaderboardService {
  /**
   * Gets the leaderboard.
   *
   * @param leaderboard the leaderboard
   * @param id the id
   */
  private static async getLeaderboardToken<T>(leaderboard: Leaderboards, id: string): Promise<T | undefined> {
    switch (leaderboard) {
      case "scoresaber": {
        return (await scoresaberService.lookupLeaderboard(id)) as T;
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
  public static async getLeaderboard<L>(leaderboardName: Leaderboards, id: string): Promise<LeaderboardResponse<L>> {
    let leaderboard: Leaderboard | undefined;
    let beatSaverMap: BeatSaverMap | undefined;

    const now = new Date();
    switch (leaderboardName) {
      case "scoresaber": {
        let foundLeaderboard = false;
        const cachedLeaderboard = await ScoreSaberLeaderboardModel.findById(id);
        if (cachedLeaderboard != null) {
          leaderboard = cachedLeaderboard.toObject() as unknown as ScoreSaberLeaderboard;
          if (
            leaderboard &&
            (leaderboard.ranked || // Never refresh ranked leaderboards (it will get refreshed every night)
              leaderboard.lastRefreshed == undefined || // Refresh if it has never been refreshed
              now.getTime() - leaderboard.lastRefreshed.getTime() > 1000 * 60 * 60 * 24) // Refresh every day
          ) {
            foundLeaderboard = true;
          }
        }

        if (!foundLeaderboard) {
          const leaderboardToken = await LeaderboardService.getLeaderboardToken<ScoreSaberLeaderboardToken>(
            leaderboardName,
            id
          );
          if (leaderboardToken == undefined) {
            throw new NotFoundError(`Leaderboard not found for "${id}"`);
          }

          leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
          leaderboard.lastRefreshed = new Date();

          await ScoreSaberLeaderboardModel.findOneAndUpdate({ _id: id }, leaderboard, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          });
        }
        if (leaderboard == undefined) {
          throw new NotFoundError(`Leaderboard not found for "${id}"`);
        }
        beatSaverMap = await BeatSaverService.getMap(leaderboard.songHash);
        break;
      }
      default: {
        throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
      }
    }

    return {
      leaderboard: leaderboard as L,
      beatsaver: beatSaverMap,
    };
  }
}
