import { Leaderboards } from "@ssr/common/leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
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
import { delay } from "@ssr/common/utils/utils";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";

const SCORESABER_REQUEST_COOLDOWN = 60_000 / 300; // 300 requests per minute
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
   * @param creationData the data to create the leaderboard from if it does not exist in the database
   * @returns the scores
   */
  public static async getLeaderboard<L>(
    leaderboardName: Leaderboards,
    id: string,
    creationData?: unknown
  ): Promise<LeaderboardResponse<L>> {
    switch (leaderboardName) {
      case "scoresaber": {
        return fetchWithCache(leaderboardCache, `${leaderboardName}-${id}`, async () => {
          const now = new Date();

          let foundLeaderboard: ScoreSaberLeaderboardDocument | undefined = undefined;
          const cachedLeaderboard: ScoreSaberLeaderboardDocument | null = await ScoreSaberLeaderboardModel.findById(id);
          if (
            cachedLeaderboard != null &&
            (cachedLeaderboard.ranked || // Never refresh ranked leaderboards (it will get refreshed every night)
              (cachedLeaderboard.lastRefreshed &&
                now.getTime() - cachedLeaderboard.lastRefreshed.getTime() > 1000 * 60 * 60 * 24)) // Refresh every day
          ) {
            foundLeaderboard = cachedLeaderboard;
          }

          if (!foundLeaderboard) {
            const leaderboardToken = creationData
              ? (creationData as ScoreSaberLeaderboardToken)
              : await LeaderboardService.getLeaderboardToken<ScoreSaberLeaderboardToken>(leaderboardName, id);
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

  /**
   * Refreshes the ranked status and stars of all ranked leaderboards.
   */
  public static async refreshRankedLeaderboards() {
    console.log(`Refreshing ranked leaderboards...`);
    let page = 1;
    let hasMorePages = true;
    const rankedIds: number[] = [];

    while (hasMorePages) {
      const leaderboardResponse = await scoresaberService.lookupLeaderboards(page, true);
      if (!leaderboardResponse) {
        console.warn(`Failed to fetch ranked leaderboards on page ${page}.`);
        break;
      }

      for (const leaderboardToken of leaderboardResponse.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
        const previousLeaderboard = await ScoreSaberLeaderboardModel.findById(leaderboard.id);
        rankedIds.push(leaderboard.id);

        if (previousLeaderboard !== undefined) {
          // Leaderboard changed data
          const rankedStatusChanged = leaderboard.ranked !== previousLeaderboard?.ranked;
          const starCountChanged = leaderboard.stars !== previousLeaderboard?.stars;
          if (rankedStatusChanged || starCountChanged) {
            console.log(`Leaderboard data changed for ${leaderboard.id}.`);
            const scores = await ScoreSaberScoreModel.find({ leaderboardId: leaderboard.id });
            if (!scores) {
              console.warn(`Failed to fetch scores for leaderboard "${leaderboard.id}".`);
              continue;
            }

            if (rankedStatusChanged) {
              console.log(
                `Leaderboard "${leaderboard.id}" ranked status changed from ${previousLeaderboard?.ranked} to ${leaderboard.ranked}.`
              );
            }
            if (starCountChanged) {
              console.log(
                `Leaderboard "${leaderboard.id}" star count changed from ${previousLeaderboard?.stars} to ${leaderboard.stars}.`
              );
            }

            // Update score pp
            if (rankedStatusChanged && !leaderboard.ranked) {
              for (const score of scores) {
                score.pp = 0;
                score.weight = 0;
              }
            }

            // Update score pp
            if ((starCountChanged && leaderboard.ranked) || (rankedStatusChanged && leaderboard.ranked)) {
              const before = Date.now();
              console.log(`Recalculating scores pp for leaderboard "${leaderboard.id}".`);
              for (const score of scores) {
                score.pp = scoresaberService.getPp(leaderboard.stars, score.accuracy);
              }
              console.log(`Recalculated scores pp for leaderboard "${leaderboard.id}" in ${Date.now() - before}ms.`);
            }

            // Save scores
            await Promise.all(scores.map(score => score.save()));
          }
        }

        await ScoreSaberLeaderboardModel.findOneAndUpdate(
          { _id: leaderboard.id },
          {
            lastRefreshed: new Date(),
            ...leaderboard,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
      }

      if (page >= Math.ceil(leaderboardResponse.metadata.total / leaderboardResponse.metadata.itemsPerPage)) {
        hasMorePages = false;
      }

      page++;
      await delay(SCORESABER_REQUEST_COOLDOWN);
    }

    // Un-rank all unranked leaderboards
    const leaderboards = await ScoreSaberLeaderboardModel.find({ ranked: true, _id: { $nin: rankedIds } });
    console.log(`Unranking ${leaderboards.length} previously ranked leaderboards...`);
    for (const leaderboard of leaderboards) {
      if (rankedIds.includes(leaderboard.id)) {
        continue;
      }

      const scores = await ScoreSaberScoreModel.find({ leaderboardId: leaderboard.id });
      if (!scores) {
        console.warn(`Failed to fetch scores for leaderboard "${leaderboard.id}".`);
        continue;
      }

      for (const score of scores) {
        score.pp = 0;
        score.weight = 0;
      }

      await Promise.all(scores.map(score => score.save()));
      await ScoreSaberLeaderboardModel.findOneAndUpdate(
        { _id: leaderboard.id },
        {
          lastRefreshed: new Date(),
          ranked: false,
          stars: 0,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log(`Previously ranked leaderboard "${leaderboard.id}" has been unranked.`);
    }

    console.log(`Finished refreshing leaderboards, total pages refreshed: ${page - 1}.`);
  }
}
