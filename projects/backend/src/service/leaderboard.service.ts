import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { NotFoundError } from "elysia";
import BeatSaverService from "./beatsaver.service";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardDocument,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { fetchWithCache } from "../common/cache.util";
import { delay } from "@ssr/common/utils/utils";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import CacheService, { ServiceCache } from "./cache.service";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";

export const SCORESABER_REQUEST_COOLDOWN = 60_000 / 300; // 300 requests per minute
const CACHE_REFRESH_TIME = 1000 * 60 * 60 * 12; // 12 hours

export default class LeaderboardService {
  /**
   * Checks if a cached leaderboard should be used based on ranking and refresh time
   *
   * @param cachedLeaderboard the cached leaderboard document
   * @param options fetch options
   * @returns object containing whether to use cache and if document was found
   */
  private static validateCachedLeaderboard(
    cachedLeaderboard: ScoreSaberLeaderboardDocument | null,
    options?: { cacheOnly?: boolean }
  ): { cached: boolean; foundLeaderboard?: ScoreSaberLeaderboardDocument } {
    if (cachedLeaderboard === null) {
      return { cached: false };
    }

    const now = new Date();

    // Use cache if:
    // 1. The map is ranked
    // 2. We're requested to only use cache
    // 3. The cache is fresh (less than 12 hours old)
    if (
      cachedLeaderboard.ranked ||
      options?.cacheOnly ||
      (cachedLeaderboard.lastRefreshed &&
        now.getTime() - cachedLeaderboard.lastRefreshed.getTime() < CACHE_REFRESH_TIME)
    ) {
      return {
        cached: true,
        foundLeaderboard: cachedLeaderboard,
      };
    }

    return { cached: true };
  }

  /**
   * Gets a ScoreSaber leaderboard by ID.
   *
   * @param id the leaderboard id
   * @param options the fetch options
   * @returns the scores
   */
  public static async getLeaderboard(
    id: string,
    options?: {
      cacheOnly?: boolean;
      includeBeatSaver?: boolean;
    }
  ): Promise<LeaderboardResponse<ScoreSaberLeaderboard>> {
    if (!options) {
      options = {
        includeBeatSaver: true,
      };
    }

    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), id, async () => {
      const cachedLeaderboard = await ScoreSaberLeaderboardModel.findById(id);
      const { cached, foundLeaderboard } = this.validateCachedLeaderboard(cachedLeaderboard, options);

      let leaderboard = foundLeaderboard;
      if (!leaderboard) {
        const leaderboardToken = await scoresaberService.lookupLeaderboard(id);
        if (leaderboardToken == undefined) {
          throw new NotFoundError(`Leaderboard not found for "${id}"`);
        }

        leaderboard = await LeaderboardService.saveLeaderboard(id, leaderboardToken);
      }

      return LeaderboardService.processLeaderboard(leaderboard, options, cached);
    });
  }

  /**
   * Gets a ScoreSaber leaderboard by hash.
   *
   * @param hash the leaderboard hash
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   * @param options the fetch options
   * @returns the scores
   */
  public static async getLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    options?: {
      cacheOnly?: boolean;
      includeBeatSaver?: boolean;
    }
  ): Promise<LeaderboardResponse<ScoreSaberLeaderboard>> {
    if (!options) {
      options = {
        includeBeatSaver: true,
      };
    }

    const cacheKey = `${hash}-${difficulty}-${characteristic}`;

    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), cacheKey, async () => {
      const cachedLeaderboard = await ScoreSaberLeaderboardModel.findOne({
        songHash: hash,
        "difficulty.difficulty": difficulty,
        "difficulty.characteristic": characteristic,
      });

      const { cached, foundLeaderboard } = this.validateCachedLeaderboard(cachedLeaderboard, options);

      let leaderboard = foundLeaderboard;
      if (!leaderboard) {
        const leaderboardToken = await scoresaberService.lookupLeaderboardByHash(hash, difficulty, characteristic);
        if (leaderboardToken == undefined) {
          throw new NotFoundError(
            `Leaderboard not found for hash "${hash}", difficulty "${difficulty}", characteristic "${characteristic}"`
          );
        }

        leaderboard = await LeaderboardService.saveLeaderboard(leaderboardToken.id + "", leaderboardToken);
      }

      return LeaderboardService.processLeaderboard(leaderboard, options, cached);
    });
  }

  /**
   * Saves a leaderboard to the database.
   *
   * @param id the leaderboard id
   * @param leaderboardToken the leaderboard token from ScoreSaber
   * @returns the saved leaderboard document
   */
  private static async saveLeaderboard(
    id: string,
    leaderboardToken: ScoreSaberLeaderboardToken
  ): Promise<ScoreSaberLeaderboardDocument> {
    const savedLeaderboard = await ScoreSaberLeaderboardModel.findOneAndUpdate(
      { _id: id },
      {
        ...getScoreSaberLeaderboardFromToken(leaderboardToken),
        lastRefreshed: new Date(),
        songArtColor: "#fff",
        // songArtColor: (await ImageService.getAverageImageColor(leaderboardToken.coverImage))?.color,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    if (!savedLeaderboard) {
      throw new Error(`Failed to save leaderboard for "${id}"`);
    }

    return savedLeaderboard;
  }

  /**
   * Processes a leaderboard document and returns the response.
   *
   * @param foundLeaderboard the found leaderboard document
   * @param options the processing options
   * @param cached whether the leaderboard was cached
   * @returns the processed leaderboard response
   */
  private static async processLeaderboard(
    foundLeaderboard: ScoreSaberLeaderboardDocument,
    options: {
      cacheOnly?: boolean;
      includeBeatSaver?: boolean;
    },
    cached: boolean
  ): Promise<LeaderboardResponse<ScoreSaberLeaderboard>> {
    if (foundLeaderboard == undefined) {
      throw new NotFoundError(`Leaderboard not found`);
    }

    const beatSaverMap = options.includeBeatSaver
      ? await BeatSaverService.getMap(
          foundLeaderboard.songHash,
          foundLeaderboard.difficulty.difficulty,
          foundLeaderboard.difficulty.characteristic
        )
      : undefined;

    const leaderboard = (
      await LeaderboardService.fixMaxScore(foundLeaderboard, beatSaverMap)
    ).toObject() as ScoreSaberLeaderboard;

    if (leaderboard.fullName == undefined) {
      leaderboard.fullName = `${leaderboard.songName} ${leaderboard.songSubName}`;
    }

    return {
      leaderboard: leaderboard as ScoreSaberLeaderboard,
      beatsaver: beatSaverMap,
      cached: cached,
    } as LeaderboardResponse<ScoreSaberLeaderboard>;
  }

  /**
   * Fixes the max score if it's broken.
   *
   * @param leaderboard the leaderboard
   * @param beatSaverMap the beatSaverMap
   */
  private static async fixMaxScore(
    leaderboard: ScoreSaberLeaderboardDocument,
    beatSaverMap: BeatSaverMapResponse | undefined
  ) {
    // Fix max score if it's broken (ScoreSaber is annoying)
    if (leaderboard.maxScore == 0 && beatSaverMap != undefined && beatSaverMap.difficulty?.maxScore != undefined) {
      leaderboard.maxScore = beatSaverMap.difficulty.maxScore;
      await leaderboard.save();
    }

    return leaderboard;
  }

  /**
   * Refreshes the ranked status and stars of all ranked leaderboards.
   *
   * @returns the amount of leaderboards refreshed and the amount of scores updated
   */
  public static async refreshRankedLeaderboards(): Promise<{
    refreshedLeaderboards: number;
    updatedScores: number;
  }> {
    console.log(`Refreshing ranked leaderboards...`);
    let updatedScores = 0;

    let page = 1;
    let hasMorePages = true;
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const rankedMapDiffs: Map<string, LeaderboardDifficulty[]> = new Map();

    while (hasMorePages) {
      const leaderboardResponse = await scoresaberService.lookupLeaderboards(page, {
        ranked: true,
      });
      if (!leaderboardResponse) {
        console.warn(`Failed to fetch ranked leaderboards on page ${page}.`);
        continue;
      }
      const totalPages = Math.ceil(leaderboardResponse.metadata.total / leaderboardResponse.metadata.itemsPerPage);
      console.log(
        `Fetched ${leaderboardResponse.leaderboards.length} ranked leaderboards on page ${page}/${totalPages}.`
      );

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

        if (previousLeaderboard !== null) {
          // Leaderboard changed data
          const rankedStatusChanged = leaderboard.ranked !== previousLeaderboard?.ranked;
          const starCountChanged = leaderboard.stars !== previousLeaderboard?.stars;
          if (rankedStatusChanged || starCountChanged) {
            console.log(`Leaderboard data changed for ${leaderboard.id}.`);

            // Get the latest scores for the leaderboard
            const scores = await ScoreSaberScoreModel.find({
              leaderboardId: leaderboard.id,
            }).sort({ timestamp: -1 });
            if (!scores) {
              console.warn(`Failed to fetch local scores for leaderboard "${leaderboard.id}".`);
              break;
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

            // Reset score pp values if the leaderboard is no longer ranked
            if (rankedStatusChanged && !leaderboard.ranked) {
              for (const score of scores) {
                score.pp = 0;
                score.weight = 0;
              }
            }

            // Update score pp for newly ranked or changed star count leaderboards
            if ((starCountChanged && leaderboard.ranked) || (rankedStatusChanged && leaderboard.ranked)) {
              const scoreTokens: ScoreSaberScoreToken[] = [];

              let currentScoresPage = 1;
              let hasMoreScores = true;
              let totalPages = 0;

              // Fetch all scores for this leaderboard
              while (hasMoreScores) {
                const scoresResponse = await scoresaberService.lookupLeaderboardScores(
                  leaderboard.id + "",
                  currentScoresPage
                );
                if (!scoresResponse) {
                  console.warn(
                    `Failed to fetch scoresaber api scores for leaderboard "${leaderboard.id}". (current page: ${currentScoresPage}, total pages: ${totalPages})`
                  );
                  await delay(SCORESABER_REQUEST_COOLDOWN);
                  currentScoresPage++; // skip this page
                  continue;
                }

                totalPages = Math.ceil(scoresResponse.metadata.total / scoresResponse.metadata.itemsPerPage);

                if (currentScoresPage >= totalPages) {
                  totalPages = 0;
                  hasMoreScores = false;
                }

                for (const score of scoresResponse.scores) {
                  scoreTokens.push(score);
                }

                currentScoresPage++;
                await delay(SCORESABER_REQUEST_COOLDOWN);
              }

              // Update scores
              for (const scoreToken of scoreTokens) {
                const score = scores.find(
                  score => score.scoreId === scoreToken.id + "" && score.score == scoreToken.baseScore
                );

                // Score not tracked, so ignore
                if (!score) {
                  continue;
                }
                score.pp = scoreToken.pp;
                score.weight = scoreToken.weight;
                score.rank = scoreToken.rank;
                updatedScores++;

                console.log(`Updated score ${score.id} for leaderboard ${leaderboard.fullName}, new pp: ${score.pp}`);

                const previousScores = await ScoreSaberPreviousScoreModel.find({
                  playerId: score.playerId,
                  leaderboardId: score.leaderboardId,
                });

                // Update the previous scores with the new star count
                if (previousScores.length > 0) {
                  for (const previousScore of previousScores) {
                    if (rankedStatusChanged && !leaderboard.ranked) {
                      previousScore.pp = 0;
                    } else {
                      previousScore.pp = scoresaberService.getPp(leaderboard.stars, previousScore.accuracy);
                    }
                    previousScore.weight = 0;
                    await previousScore.save();
                  }

                  console.log(
                    `Updated previous scores pp values on leaderboard ${leaderboard.fullName} for player ${score.playerId}`
                  );
                }
              }

              // Save scores
              await Promise.all(
                scores.map(score => {
                  if (!score.save) {
                    console.warn(`ScoreSaberScoreDocument is missing save method: ${JSON.stringify(score)}`);
                    return;
                  }
                  return score.save();
                })
              );
            }

            // Save leaderboard
            if (starCountChanged || rankedStatusChanged) {
              await ScoreSaberLeaderboardModel.findOneAndUpdate(
                { _id: leaderboard.id },
                {
                  lastRefreshed: new Date(),
                  ...leaderboard,
                  difficulties: previousLeaderboard.difficulties ?? [],
                }
              );
            }
          }
        }
      }

      if (page >= totalPages) {
        hasMorePages = false;
      }

      page++;
      await delay(SCORESABER_REQUEST_COOLDOWN);
    }

    let updatedLeaderboards = 0;
    // Update all leaderboards
    console.log(`Saving ${leaderboards.length} ranked leaderboards...`);
    await Promise.all(
      leaderboards.map(async leaderboard => {
        // Sort difficulties from Easy to ExpertPlus
        const difficulties = rankedMapDiffs
          .get(leaderboard.songHash)
          ?.sort((a, b) => getDifficulty(a.difficulty).id - getDifficulty(b.difficulty).id);

        // Only update if the difficulties have changed
        if (leaderboard.difficulties.length !== difficulties?.length) {
          updatedLeaderboards++;
          await ScoreSaberLeaderboardModel.findOneAndUpdate(
            { _id: leaderboard.id },
            {
              lastRefreshed: new Date(),
              ...leaderboard,
              difficulties: difficulties ?? [],
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            }
          );
        }
      })
    );
    console.log(`Updated ${updatedLeaderboards}/${leaderboards.length} ranked leaderboards.`);

    // Un-rank all unranked leaderboards
    const rankedIds = leaderboards.map(leaderboard => leaderboard.id);
    const rankedLeaderboards = await ScoreSaberLeaderboardModel.find({ ranked: true, _id: { $nin: rankedIds } });
    let totalUnranked = 0;
    for (const previousLeaderboard of rankedLeaderboards) {
      const leaderboard = await scoresaberService.lookupLeaderboard(previousLeaderboard.id + "");
      if (!leaderboard) {
        continue;
      }
      if (!leaderboard.ranked) {
        totalUnranked++;

        const scores = await ScoreSaberScoreModel.find({ leaderboardId: leaderboard.id });
        if (!scores) {
          console.warn(`Failed to fetch local scores in unrank for leaderboard "${leaderboard.id}".`);
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
            ...leaderboard,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
        console.log(`Previously ranked leaderboard "${leaderboard.id}" has been unranked.`);
      }

      await delay(SCORESABER_REQUEST_COOLDOWN);
    }
    console.log(`Unranked ${totalUnranked} previously ranked leaderboards.`);
    console.log(`Finished refreshing leaderboards, total pages refreshed: ${page - 1}.`);

    return {
      refreshedLeaderboards: leaderboards.length,
      updatedScores,
    };
  }

  /**
   * Refreshes the qualified leaderboards
   */
  public static async refreshQualifiedLeaderboards() {
    console.log(`Refreshing qualified leaderboards...`);
    let page = 1;
    let hasMorePages = true;
    const leaderboards: ScoreSaberLeaderboard[] = [];
    while (hasMorePages) {
      const leaderboardResponse = await scoresaberService.lookupLeaderboards(page, {
        qualified: true,
      });
      if (!leaderboardResponse) {
        console.warn(`Failed to fetch qualified leaderboards on page ${page}.`);
        break;
      }

      for (const leaderboardToken of leaderboardResponse.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
        leaderboards.push(leaderboard);
      }
      if (page >= Math.ceil(leaderboardResponse.metadata.total / leaderboardResponse.metadata.itemsPerPage)) {
        hasMorePages = false;
      }
      page++;
      await delay(SCORESABER_REQUEST_COOLDOWN);
    }

    console.log(`Saving ${leaderboards.length} qualified leaderboards...`);
    await Promise.all(
      leaderboards.map(async leaderboard => {
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
      })
    );
    console.log(`Saved ${leaderboards.length} qualified leaderboards.`);
  }

  /**
   * Gets all the ranked leaderboards
   *
   * @returns the ranked leaderboards
   */
  public static async getRankedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), "ranked-leaderboards", async () => {
      const leaderboards = await ScoreSaberLeaderboardModel.find({ ranked: true }).sort({ dateRanked: -1 }); // Sort by date ranked (newest -> oldest)
      return leaderboards.map(leaderboard => leaderboard.toObject());
    });
  }

  /**
   * Gets all the qualified leaderboards
   *
   * @returns the qualified leaderboards
   */
  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), "qualified-leaderboards", async () => {
      const leaderboards = await ScoreSaberLeaderboardModel.find({ qualified: true });
      return leaderboards.map(leaderboard => leaderboard.toObject());
    });
  }
}
