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
  ScoreSaberLeaderboardDocument,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { getBeatSaverDifficulty } from "@ssr/common/utils/beatsaver.util";
import { SSRCache } from "@ssr/common/cache";
import { fetchWithCache } from "../common/cache.util";

const leaderboardCache = new SSRCache({
  ttl: 1000 * 60 * 10, // 10 minutes
});

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
    const now = new Date();
    switch (leaderboardName) {
      case "scoresaber": {
        return fetchWithCache(leaderboardCache, `${leaderboardName}-${id}`, async () => {
          let foundLeaderboard: ScoreSaberLeaderboardDocument | undefined = undefined;
          const cachedLeaderboard: ScoreSaberLeaderboardDocument | null = await ScoreSaberLeaderboardModel.findById(id);
          if (cachedLeaderboard != null) {
            if (
              cachedLeaderboard &&
              (cachedLeaderboard.ranked || // Never refresh ranked leaderboards (it will get refreshed every night)
                cachedLeaderboard.lastRefreshed == undefined || // Refresh if it has never been refreshed
                now.getTime() - cachedLeaderboard.lastRefreshed.getTime() > 1000 * 60 * 60 * 24) // Refresh every day
            ) {
              foundLeaderboard = cachedLeaderboard;
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

            foundLeaderboard = await ScoreSaberLeaderboardModel.findOneAndUpdate(
              { _id: id },
              {
                $setOnInsert: { lastRefreshed: new Date() }, // only sets if inserted
                ...getScoreSaberLeaderboardFromToken(leaderboardToken),
              },
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
              }
            );
          }
          if (foundLeaderboard == undefined) {
            throw new NotFoundError(`Leaderboard not found for "${id}"`);
          }
          const beatSaverMap = await BeatSaverService.getMap(foundLeaderboard.songHash);
          const leaderboard = (
            await LeaderboardService.fixMaxScore(foundLeaderboard, beatSaverMap)
          ).toObject() as ScoreSaberLeaderboard;

          return {
            leaderboard: leaderboard as L,
            beatsaver: beatSaverMap,
          } as LeaderboardResponse<L>;
        });
      }
      default: {
        throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
      }
    }
  }

  /**
   * Fixes the max score if it's broken.
   *
   * @param leaderboard the leaderboard
   * @param beatSaverMap the beatSaverMap
   */
  private static async fixMaxScore(leaderboard: ScoreSaberLeaderboardDocument, beatSaverMap: BeatSaverMap | undefined) {
    // Fix max score if it's broken (ScoreSaber is annoying)
    if (leaderboard.maxScore == 0 && beatSaverMap != undefined) {
      const difficulty = leaderboard.difficulty;
      const beatSaverDiff = getBeatSaverDifficulty(
        beatSaverMap,
        leaderboard.songHash,
        difficulty.difficulty,
        difficulty.characteristic.includes("Standard") ? "Standard" : difficulty.characteristic
      );

      if (beatSaverDiff != undefined) {
        leaderboard.maxScore = beatSaverDiff.maxScore;
        await leaderboard.save();
      }
    }

    return leaderboard;
  }
}
