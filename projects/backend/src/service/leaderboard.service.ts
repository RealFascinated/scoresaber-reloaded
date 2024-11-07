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
import { fetchWithCache } from "../common/cache.util";
import { delay } from "@ssr/common/utils/utils";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import CacheService, { ServiceCache } from "./cache.service";
import { ImageService } from "./image.service";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";

const SCORESABER_REQUEST_COOLDOWN = 60_000 / 300; // 300 requests per minute

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
    switch (leaderboardName) {
      case "scoresaber": {
        return fetchWithCache(
          CacheService.getCache(ServiceCache.Leaderboards),
          `${leaderboardName}:${id}`,
          async () => {
            const now = new Date();

            let foundLeaderboard: ScoreSaberLeaderboardDocument | undefined = undefined;
            const cachedLeaderboard: ScoreSaberLeaderboardDocument | null =
              await ScoreSaberLeaderboardModel.findById(id);
            if (cachedLeaderboard !== null) {
              if (cachedLeaderboard.ranked) {
                foundLeaderboard = cachedLeaderboard;
              } else if (cachedLeaderboard.lastRefreshed) {
                if (now.getTime() - cachedLeaderboard.lastRefreshed.getTime() < 1000 * 60 * 60 * 12) {
                  foundLeaderboard = cachedLeaderboard;
                }
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
                  ...getScoreSaberLeaderboardFromToken(leaderboardToken),
                  lastRefreshed: new Date(),
                  songArtColor: (await ImageService.getAverageImageColor(leaderboardToken.coverImage))?.color,
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
          }
        );
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
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const rankedMapDiffs: Map<string, LeaderboardDifficulty[]> = new Map();

    while (hasMorePages) {
      const leaderboardResponse = await scoresaberService.lookupLeaderboards(page, true);
      if (!leaderboardResponse) {
        console.warn(`Failed to fetch ranked leaderboards on page ${page}.`);
        break;
      }

      for (const leaderboardToken of leaderboardResponse.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
        const previousLeaderboard = await ScoreSaberLeaderboardModel.findById(leaderboard.id);
        leaderboards.push(leaderboard);

        const difficulties = rankedMapDiffs.get(leaderboard.songHash) ?? [];
        difficulties.push({
          leaderboardId: leaderboard.id,
          difficulty: leaderboard.difficulty.difficulty,
          characteristic: leaderboard.difficulty.characteristic,
          difficultyRaw: leaderboard.difficulty.difficultyRaw,
        });
        rankedMapDiffs.set(leaderboard.songHash, difficulties);

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
                if (score.accuracy == Infinity) {
                  score.accuracy = (score.score / leaderboard.maxScore) * 100;
                }
                score.pp = scoresaberService.getPp(leaderboard.stars, score.accuracy);
              }
              console.log(`Recalculated scores pp for leaderboard "${leaderboard.id}" in ${Date.now() - before}ms.`);
            }

            // Save scores
            await Promise.all(scores.map(score => score.save()));
          }
        }
      }

      if (page >= Math.ceil(leaderboardResponse.metadata.total / leaderboardResponse.metadata.itemsPerPage)) {
        hasMorePages = false;
      }

      page++;
      await delay(SCORESABER_REQUEST_COOLDOWN);
    }

    // Update all leaderboards
    console.log(`Saving ${leaderboards.length} ranked leaderboards...`);
    for (const leaderboard of leaderboards) {
      await ScoreSaberLeaderboardModel.findOneAndUpdate(
        { _id: leaderboard.id },
        {
          lastRefreshed: new Date(),
          ...leaderboard,
          difficulties: rankedMapDiffs.get(leaderboard.songHash),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }
    console.log(`Saved ${leaderboards.length} ranked leaderboards.`);

    // Un-rank all unranked leaderboards
    const rankedIds = leaderboards.map(leaderboard => leaderboard.id);
    const rankedLeaderboards = await ScoreSaberLeaderboardModel.find({ ranked: true, _id: { $nin: rankedIds } });
    console.log(`Unranking ${rankedLeaderboards.length} previously ranked leaderboards...`);
    for (const leaderboard of rankedLeaderboards) {
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
