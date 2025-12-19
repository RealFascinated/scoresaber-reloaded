import { CooldownPriority } from "@ssr/common/cooldown";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import {
  PlayerScoreChartDataPoint,
  PlayerScoresChartResponse,
} from "@ssr/common/schemas/response/player/scores-chart";
import { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { ScoreQuery, SortDirection, SortField } from "@ssr/common/types/score-query";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import ScoreSaberPlayerScoresPageToken from "@ssr/common/types/token/scoresaber/player-scores-page";
import { scoreToObject } from "@ssr/common/utils/model-converters";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { FilterQuery } from "mongoose";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import BeatSaverService from "../beatsaver.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import ScoreSaberService from "../scoresaber.service";

const FIELDS_MAP: Record<SortField, string> = {
  pp: "pp",
  medals: "medals",
  score: "score",
  misses: "misses",
  acc: "accuracy",
  maxcombo: "maxCombo",
  date: "timestamp",
};

export class PlayerScoresService {
  /**
   * Fetches missing scores for a player.
   *
   * @param player the player to refresh scores for
   * @param playerToken the player's token
   * @returns the result of the fetch
   */
  public static async fetchMissingPlayerScores(
    player: Player,
    playerToken: ScoreSaberPlayerToken
  ): Promise<{
    missingScores: number;
    totalScores: number;
    totalPagesFetched: number;
    timeTaken: number;
  }> {
    const startTime = performance.now();
    const playerId = playerToken.id;
    const playerScoresCount = await ScoreSaberScoreModel.countDocuments({
      playerId: playerId,
    });

    // The player has the correct number of scores
    if (playerScoresCount === playerToken.scoreStats.totalPlayCount) {
      // Mark player as seeded
      if (!player.seededScores) {
        await PlayerModel.updateOne({ _id: player._id }, { $set: { seededScores: true } });
      }

      return {
        missingScores: 0,
        totalScores: playerScoresCount,
        totalPagesFetched: 0,
        timeTaken: 0,
      };
    }

    const result = {
      missingScores: 0,
      totalScores: playerScoresCount,
      totalPagesFetched: 0,
      timeTaken: 0,
    };

    /**
     * Gets a page of scores for a player.
     *
     * @param page the page to get
     * @returns the scores page
     */
    async function getScoresPage(
      page: number
    ): Promise<ScoreSaberPlayerScoresPageToken | undefined> {
      return ScoreSaberApiService.lookupPlayerScores({
        playerId: playerId,
        page: page,
        limit: 100,
        sort: "recent",
        priority: CooldownPriority.BACKGROUND,
      });
    }

    /**
     * Parse a score token into a score and leaderboard.
     *
     * @param scoreToken the score token to process
     * @returns the score and leaderboard
     */
    function parseScoreToken(scoreToken: ScoreSaberPlayerScoreToken): {
      score: ScoreSaberScore | undefined;
      leaderboard: ScoreSaberLeaderboard | undefined;
    } {
      const leaderboard = getScoreSaberLeaderboardFromToken(scoreToken.leaderboard);
      if (leaderboard !== undefined) {
        const score = getScoreSaberScoreFromToken(scoreToken.score, leaderboard, playerId);
        if (score !== undefined) {
          return { score, leaderboard };
        }
      }
      return { score: undefined, leaderboard: undefined };
    }

    /**
     * Handles desynced score count. This will delete the player's scores and re-seed them.
     *
     * @param scoresPage the scores page
     * @param playerScoresCount the current count of player scores in the database
     */
    async function handleDesyncedScoreCount(
      scoresPage: ScoreSaberPlayerScoresPageToken,
      playerScoresCount: number
    ): Promise<void> {
      Logger.info(
        `[Score Refresh] Player %s has more scores than they should (%s > %s). Deleteing their scores and re-seeding...`,
        playerId,
        playerScoresCount,
        scoresPage.metadata.total
      );

      await ScoreSaberScoreModel.deleteMany({
        playerId: playerId,
      });
      result.totalScores = 0;

      player.seededScores = false;
      await PlayerModel.updateOne({ _id: playerId }, { $set: { seededScores: false } });

      // Notify
      sendEmbedToChannel(
        DiscordChannels.PLAYER_SCORE_REFRESH_LOGS,
        new EmbedBuilder()
          .setTitle("Player Has More Scores Than They Should!")
          .setDescription(
            `**${playerToken.name}** has more scores than they should. Deleting their scores and re-seeding...`
          )
          .addFields([
            {
              name: "Has",
              value: formatNumberWithCommas(playerScoresCount),
              inline: true,
            },
            {
              name: "Should Have",
              value: formatNumberWithCommas(scoresPage.metadata.total),
              inline: true,
            },
          ])
          .setTimestamp()
          .setColor("#ff0000")
      );
    }

    /**
     * Processes a page of scores.
     *
     * @param page the page to process
     * @returns whether the page has more scores to process
     */
    async function processPage(
      currentPage: number,
      scoresPage: ScoreSaberPlayerScoresPageToken
    ): Promise<boolean> {
      for (const scoreToken of scoresPage.playerScores) {
        const { score, leaderboard } = parseScoreToken(scoreToken);
        if (!score || !leaderboard) {
          result.totalScores++;
          continue;
        }
        const trackingResult = await ScoreCoreService.trackScoreSaberScore(
          score,
          leaderboard,
          playerToken,
          undefined,
          false
        );
        if (trackingResult.tracked) {
          result.missingScores++;
          result.totalScores++;
        }
      }

      // We've found all the scores we need
      if (result.totalScores >= scoresPage.metadata.total) {
        return false;
      }

      // No more pages to fetch
      return currentPage < Math.ceil(scoresPage.metadata.total / scoresPage.metadata.itemsPerPage);
    }

    let currentPage = 1;
    let hasMoreScores = true;
    while (hasMoreScores) {
      const scoresPage = await getScoresPage(currentPage);
      if (!scoresPage) {
        hasMoreScores = false;
        continue;
      }

      // Only check for desynced score count on the first page
      if (currentPage === 1) {
        const shouldDeleteScores = playerScoresCount > scoresPage.metadata.total;
        if (shouldDeleteScores) {
          await handleDesyncedScoreCount(scoresPage, playerScoresCount);
        }
      }

      hasMoreScores = await processPage(currentPage, scoresPage);
      if (!hasMoreScores) {
        break;
      }
      currentPage++;
    }

    // Mark player as seeded
    if (!player.seededScores) {
      await PlayerModel.updateOne({ _id: player._id }, { $set: { seededScores: true } });
    }

    result.timeTaken = performance.now() - startTime;
    result.totalPagesFetched = currentPage - 1;
    if (currentPage !== 1) {
      Logger.info(
        `[Score Refresh] Fetched missing scores for %s, total pages fetched: %s, total scores: %s, missing scores: %s, in %s`,
        playerId,
        formatNumberWithCommas(result.totalPagesFetched),
        formatNumberWithCommas(result.totalScores),
        formatNumberWithCommas(result.missingScores),
        formatDuration(result.timeTaken)
      );
    }

    return result;
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player's id
   */
  public static async getPlayerScoreChart(playerId: string): Promise<PlayerScoresChartResponse> {
    const scores = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          playerId: playerId,
          leaderboardId: { $exists: true, $nin: [null, undefined] },
          pp: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: "scoresaber-leaderboards",
          localField: "leaderboardId",
          foreignField: "_id",
          as: "leaderboard",
        },
      },
      {
        $unwind: {
          path: "$leaderboard",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          accuracy: 1,
          pp: 1,
          timestamp: 1,
          leaderboardId: 1,
          leaderboard: 1,
        },
      },
      {
        $sort: {
          timestamp: -1,
        },
      },
    ]);

    if (!scores.length) {
      return {
        data: [],
      };
    }

    const dataPoints: PlayerScoreChartDataPoint[] = [];
    for (const score of scores) {
      const leaderboard = score.leaderboard;
      if (!leaderboard) {
        continue;
      }
      dataPoints.push({
        accuracy: score.accuracy,
        stars: leaderboard.stars,
        pp: score.pp,
        timestamp: score.timestamp,
        leaderboardId: leaderboard._id,
        leaderboardName: leaderboard.fullName,
        leaderboardDifficulty: getDifficultyName(getDifficulty(leaderboard.difficulty.difficulty)),
      });
    }

    return {
      data: dataPoints,
    };
  }

  /**
   * Gets a score by its ID.
   *
   * @param scoreId the id of the score
   * @returns the score
   */
  public static async getScore(scoreId: string): Promise<PlayerScore> {
    const rawScore = await ScoreSaberScoreModel.findOne({ scoreId: `${scoreId}` }).lean();
    if (!rawScore) {
      throw new NotFoundError("Score not found");
    }

    const leaderboardResponse = await LeaderboardCoreService.getLeaderboard(
      rawScore.leaderboardId,
      {
        includeBeatSaver: true,
        beatSaverType: "full",
      }
    );
    if (!leaderboardResponse) {
      throw new NotFoundError("Leaderboard not found");
    }

    const score = await ScoreCoreService.insertScoreData(
      scoreToObject(rawScore as unknown as ScoreSaberScore),
      leaderboardResponse.leaderboard,
      {
        insertPlayerInfo: true,
        insertAdditionalData: true,
        removeScoreWeightAndRank: true,
      }
    );
    return {
      score: score,
      leaderboard: leaderboardResponse.leaderboard,
      beatSaver: leaderboardResponse.beatsaver,
    };
  }

  /**
   * Looks up player scores.
   *
   * @param playerId the player id
   * @param pageNumber the page to get
   * @param sort the sort to get
   * @param search the search to get
   */
  public static async getScoreSaberLivePlayerScores(
    playerId: string,
    pageNumber: number,
    sort: string,
    search?: string,
    comparisonPlayerId?: string
  ): Promise<PlayerScoresPageResponse> {
    // Get the requested page directly
    const requestedPage = await ScoreSaberApiService.lookupPlayerScores({
      playerId,
      page: pageNumber,
      sort: sort as ScoreSaberScoreSort,
      search,
    });

    if (!requestedPage) {
      return Pagination.empty<PlayerScore>();
    }

    const pagination = new Pagination<PlayerScore>()
      .setItemsPerPage(requestedPage.metadata.itemsPerPage)
      .setTotalItems(requestedPage.metadata.total);

    let comparisonPlayer: ScoreSaberPlayer | undefined;
    if (comparisonPlayerId !== playerId && comparisonPlayerId !== undefined) {
      comparisonPlayer = await ScoreSaberService.getPlayer(
        comparisonPlayerId,
        "basic",
        await ScoreSaberService.getCachedPlayer(comparisonPlayerId)
      );
    }
    return await pagination.getPage(pageNumber, async () => {
      const scores = await Promise.all(
        requestedPage.playerScores.map(async playerScore => {
          const leaderboard = getScoreSaberLeaderboardFromToken(playerScore.leaderboard);
          const score = getScoreSaberScoreFromToken(playerScore.score, leaderboard, playerId);
          if (!score) {
            return undefined;
          }

          // Track missing scores
          ScoreCoreService.trackScoreSaberScore(
            score,
            leaderboard,
            await ScoreSaberService.getCachedPlayer(playerId),
            undefined,
            false
          );

          return {
            score: await ScoreCoreService.insertScoreData(score, leaderboard, {
              comparisonPlayer: comparisonPlayer,
            }),
            leaderboard: leaderboard,
            beatSaver: await BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic,
              "full"
            ),
          } as PlayerScore;
        })
      );
      return scores.filter((result): result is PlayerScore => result !== undefined);
    });
  }

  /**
   * Gets the scores for a player.
   *
   * @param mode the mode to get
   * @param playerId the player id
   * @param page the page number
   * @param options the sort options
   * @param search the search term
   * @returns the scores
   */
  public static async getPlayerScores(
    mode: "ssr" | "medals",
    playerId: string,
    page: number,
    sort: SortField,
    direction: SortDirection,
    filters: ScoreQuery
  ) {
    const model = mode === "medals" ? ScoreSaberMedalsScoreModel : ScoreSaberScoreModel;
    const leaderboardIds = await LeaderboardCoreService.searchLeaderboardIds(filters.search);
    if (leaderboardIds == null) {
      return new Pagination<PlayerScore>().setItemsPerPage(8).getPage(1, async () => []);
    }

    /**
     * Builds a score query.
     *
     * @param mode the mode to build the query for
     * @param playerId the player id
     * @param filters the filters to apply to the query
     * @param matchingLeaderboardIds the leaderboard ids to include in the query
     * @returns the score query
     */
    function buildScoreQuery(
      mode: "ssr" | "medals",
      playerId: string,
      sort: SortField,
      filters: ScoreQuery,
      matchingLeaderboardIds: number[]
    ): FilterQuery<ScoreSaberScore> {
      const queryConditions: FilterQuery<ScoreSaberScore>[] = [
        { playerId },
        { leaderboardId: { $exists: true, $ne: null } },
      ];

      // Filter out invalid accuracies (null, undefined, Infinity, etc.)
      if (sort === "acc") {
        queryConditions.push({
          accuracy: { $exists: true, $nin: [null, undefined, Infinity], $gte: 0 },
        });
      }

      // Medal scores only
      if (mode === "medals") {
        queryConditions.push({ medals: { $gt: 0 } });
      }

      // Search was used in the query
      if (matchingLeaderboardIds.length > 0) {
        queryConditions.push({ leaderboardId: { $in: matchingLeaderboardIds } });
      }

      // HMD filter was used in the query
      if (filters.hmd) {
        queryConditions.push({ hmd: filters.hmd });
      }

      return { $and: queryConditions };
    }

    const query = buildScoreQuery(mode, playerId, sort, filters, leaderboardIds);
    const totalScores = await model.countDocuments(query);

    const pagination = new Pagination<PlayerScore>().setItemsPerPage(8).setTotalItems(totalScores);

    const sortField = FIELDS_MAP[sort];
    const sortOrder = direction === "asc" ? 1 : -1;

    return pagination.getPageWithCursor(page, {
      sortField,
      sortDirection: sortOrder,
      getCursor: (item: Record<string, unknown>) => ({
        sortValue: item[sortField],
        id: item._id,
      }),
      buildCursorQuery: cursor => {
        if (!cursor) return query;
        if (direction === "asc") {
          return {
            ...query,
            $or: [
              { [sortField]: { $gt: cursor.sortValue } },
              { [sortField]: cursor.sortValue, _id: { $gt: cursor.id } },
            ],
          };
        } else {
          return {
            ...query,
            $or: [
              { [sortField]: { $lt: cursor.sortValue } },
              { [sortField]: cursor.sortValue, _id: { $lt: cursor.id } },
            ],
          };
        }
      },
      getPreviousPageItem: async query => {
        const previousPageStart = (page - 2) * 8;
        const items = await (model as typeof ScoreSaberScoreModel)
          .find(query)
          .sort({ [sortField]: sortOrder, _id: sortOrder })
          .skip(previousPageStart)
          .limit(1)
          .select({ [sortField]: 1, _id: 1 })
          .lean();
        return (items[0] as Record<string, unknown>) || null;
      },
      fetchItems: async cursorInfo => {
        const rawScores = (await (model as typeof ScoreSaberScoreModel)
          .find(cursorInfo.query)
          .sort({ [sortField]: sortOrder, _id: sortOrder })
          .limit(cursorInfo.limit)
          .lean()) as unknown as ScoreSaberScore[];

        if (!rawScores.length) {
          return [];
        }

        const leaderboardMap = await LeaderboardCoreService.batchFetchLeaderboards(
          rawScores,
          score => score.leaderboardId,
          { includeBeatSaver: true }
        );

        // Process scores in parallel
        return (
          await Promise.all(
            rawScores.map(async rawScore => {
              const leaderboardResponse = leaderboardMap.get(rawScore.leaderboardId);
              if (!leaderboardResponse) {
                return null;
              }

              const { leaderboard, beatsaver } = leaderboardResponse;
              return {
                score: await ScoreCoreService.insertScoreData(
                  scoreToObject(rawScore),
                  leaderboard,
                  {
                    removeScoreWeightAndRank: mode === "ssr",
                  }
                ),
                leaderboard: leaderboard,
                beatSaver: beatsaver,
              } as PlayerScore;
            })
          )
        ).filter(Boolean) as PlayerScore[];
      },
    });
  }
}
