import { Leaderboards } from "@ssr/common/leaderboard";
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
import { ScoreSaberScoreDocument, ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import CacheService, { ServiceCache } from "./cache.service";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDifficulty } from "@ssr/common/utils/song-utils";

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
   * @param options the fetch options
   * @returns the scores
   */
  public static async getLeaderboard<L>(
    leaderboardName: Leaderboards,
    id: string,
    options?: {
      cacheOnly?: boolean;
      includeBeatSaver?: boolean;
    }
  ): Promise<LeaderboardResponse<L>> {
    if (!options) {
      options = {
        includeBeatSaver: true,
      };
    }

    switch (leaderboardName) {
      case "scoresaber": {
        return fetchWithCache(
          CacheService.getCache(ServiceCache.Leaderboards),
          `${leaderboardName}:${id}`,
          async () => {
            const now = new Date();
            let cached = false;

            let foundLeaderboard: ScoreSaberLeaderboardDocument | undefined = undefined;
            const cachedLeaderboard: ScoreSaberLeaderboardDocument | null =
              await ScoreSaberLeaderboardModel.findById(id);
            if (cachedLeaderboard !== null) {
              cached = true;
              if (cachedLeaderboard.ranked || (options && options.cacheOnly)) {
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
                  songArtColor: "#fff",
                  // songArtColor: (await ImageService.getAverageImageColor(leaderboardToken.coverImage))?.color,
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
            const beatSaverMap =
              options && options.includeBeatSaver
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
              leaderboard: leaderboard as L,
              beatsaver: beatSaverMap,
              cached: cached,
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
    let refreshedLeaderboards = 0;
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
        break;
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
            const scores: ScoreSaberScoreDocument[] = await ScoreSaberScoreModel.aggregate([
              // Match stage based on leaderboardId
              { $match: { leaderboardId: leaderboard.id } },

              // Group by leaderboardId and playerId to get the first entry of each group
              {
                $group: {
                  _id: { leaderboardId: "$leaderboardId", playerId: "$playerId" },
                  score: { $first: "$$ROOT" }, // Keep the whole document in "score" field
                },
              },
            ]);
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

              // Fetch all scores for this leaderboard
              while (hasMoreScores) {
                const scoresResponse = await scoresaberService.lookupLeaderboardScores(
                  leaderboard.id + "",
                  currentScoresPage
                );
                if (!scoresResponse) {
                  console.warn(`Failed to fetch scores for leaderboard "${leaderboard.id}".`);
                  await delay(SCORESABER_REQUEST_COOLDOWN);
                  continue;
                }

                for (const score of scoresResponse.scores) {
                  scoreTokens.push(score);
                }

                if (
                  currentScoresPage >= Math.ceil(scoresResponse.metadata.total / scoresResponse.metadata.itemsPerPage)
                ) {
                  hasMoreScores = false;
                }

                currentScoresPage++;
                await delay(SCORESABER_REQUEST_COOLDOWN);
              }

              // Update scores
              for (const scoreToken of scoreTokens) {
                const score = scores.find(
                  // Ensure we only get the latest score for the leaderboard and player
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

                console.log(
                  `Updated score ${score.scoreId} for leaderboard ${leaderboard.fullName}, new pp: ${score.pp}`
                );

                let previousScores = await ScoreSaberScoreModel.find({
                  playerId: score.playerId,
                  leaderboardId: score.leaderboardId,
                });

                // Remove current score from previousScores
                previousScores = previousScores.filter(previousScore => previousScore.scoreId !== score.scoreId);

                // Update the previous scores with the new star count
                if (previousScores.length > 0) {
                  for (const previousScore of previousScores) {
                    previousScore.pp = scoresaberService.getPp(leaderboard.stars, score.pp);
                    previousScore.weight = 0;
                    await previousScore.save();
                  }

                  console.log(
                    `Updated previous scores pp values on leaderboard ${leaderboard.fullName} for player ${score.playerId}`
                  );
                }
              }

              // Save scores
              await Promise.all(scores.map(score => score.save()));
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

    // Update all leaderboards
    console.log(`Saving ${leaderboards.length} ranked leaderboards...`);
    await Promise.all(
      leaderboards.map(async leaderboard => {
        await ScoreSaberLeaderboardModel.findOneAndUpdate(
          { _id: leaderboard.id },
          {
            lastRefreshed: new Date(),
            ...leaderboard,
            // Sort difficulties from Easy to ExpertPlus
            difficulties:
              rankedMapDiffs
                .get(leaderboard.songHash)
                ?.sort((a, b) => getDifficulty(a.difficulty).id - getDifficulty(b.difficulty).id) ?? [],
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
      })
    );
    refreshedLeaderboards = leaderboards.length;
    console.log(`Saved ${leaderboards.length} ranked leaderboards.`);

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

      await delay(SCORESABER_REQUEST_COOLDOWN);
    }
    console.log(`Unranked ${totalUnranked} previously ranked leaderboards.`);
    console.log(`Finished refreshing leaderboards, total pages refreshed: ${page - 1}.`);

    return {
      refreshedLeaderboards,
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
