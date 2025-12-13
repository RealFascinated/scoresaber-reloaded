import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import { DetailType } from "@ssr/common/detail-type";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
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
} from "@ssr/common/response/player-scores-chart";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { Modifier } from "@ssr/common/score/modifier";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { ScoreSort, validateSort } from "@ssr/common/types/sort";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import ScoreSaberPlayerScoresPageToken from "@ssr/common/types/token/scoresaber/player-scores-page";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import type { PipelineStage } from "mongoose";
import { FilterQuery } from "mongoose";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { scoreToObject } from "../../common/score/score.util";
import BeatSaverService from "../beatsaver.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";
import ScoreSaberService from "../scoresaber.service";

const FIELDS_MAP: Record<ScoreSort["field"], string> = {
  pp: "pp",
  medals: "medals",
  score: "score",
  misses: "misses",
  acc: "accuracy",
  maxcombo: "maxCombo",
  date: "timestamp",
  starcount: "stars",
};

type ScoreFilters = Required<NonNullable<ScoreSort["filters"]>> & {
  rankedOnly: boolean;
  unrankedOnly: boolean;
  passedOnly: boolean;
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
      return ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayerScores({
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
    const playerScores = await ScoreSaberScoreModel.find({
      playerId: playerId,
      leaderboardId: { $exists: true, $nin: [null, undefined] },
      pp: { $gt: 0 },
    })
      .select({
        accuracy: 1,
        pp: 1,
        timestamp: 1,
        leaderboardId: 1,
      })
      .sort({
        timestamp: -1,
      })
      .lean();

    if (!playerScores.length) {
      return {
        data: [],
      };
    }

    const leaderboardResponses = await LeaderboardCoreService.getLeaderboards(
      playerScores.map(score => score.leaderboardId + ""),
      { includeBeatSaver: false }
    );

    const leaderboardMap = new Map(leaderboardResponses.map(r => [r.leaderboard.id, r]));

    const dataPoints: PlayerScoreChartDataPoint[] = [];
    for (const score of playerScores) {
      const leaderboard = leaderboardMap.get(score.leaderboardId)?.leaderboard;
      if (!leaderboard) {
        continue;
      }
      dataPoints.push({
        accuracy: score.accuracy,
        stars: leaderboard.stars,
        pp: score.pp,
        timestamp: score.timestamp,
        leaderboardId: leaderboard.id + "",
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
  public static async getScore(
    scoreId: string
  ): Promise<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>> {
    const rawScore = await ScoreSaberScoreModel.findOne({ scoreId: `${scoreId}` }).lean();
    if (!rawScore) {
      throw new NotFoundError("Score not found");
    }

    const leaderboardResponse = await LeaderboardCoreService.getLeaderboard(
      rawScore.leaderboardId + "",
      {
        includeBeatSaver: true,
        beatSaverType: DetailType.FULL,
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
  ): Promise<PlayerScoresResponse> {
    // Get the requested page directly
    const requestedPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayerScores({
        playerId,
        page: pageNumber,
        sort: sort as ScoreSaberScoreSort,
        search,
      });

    if (!requestedPage) {
      return Pagination.empty<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>();
    }

    const pagination = new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(requestedPage.metadata.itemsPerPage)
      .setTotalItems(requestedPage.metadata.total);

    let comparisonPlayer: ScoreSaberPlayer | undefined;
    if (comparisonPlayerId !== playerId && comparisonPlayerId !== undefined) {
      comparisonPlayer = await ScoreSaberService.getPlayer(
        comparisonPlayerId,
        DetailType.BASIC,
        await ScoreSaberService.getCachedPlayer(comparisonPlayerId, true),
        { setInactivesRank: false, setMedalsRank: false }
      );
    }
    return await pagination.getPage(pageNumber, async () => {
      return (
        await Promise.all(
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
              await ScoreSaberService.getCachedPlayer(playerId, true),
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
                leaderboard.difficulty.characteristic
              ),
            } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
          })
        )
      ).filter(
        (result): result is PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> =>
          result !== undefined
      );
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
   * @param model the model to use
   * @returns the scores
   */
  public static async getPlayerScores(
    mode: "ssr" | "medals",
    playerId: string,
    page: number,
    options: ScoreSort,
    search: string
  ) {
    const model = mode === "medals" ? ScoreSaberMedalsScoreModel : ScoreSaberScoreModel;
    const isValid = validateSort(options);
    if (!isValid) {
      throw new BadRequestError("Invalid sort options");
    }

    const filters: ScoreFilters = {
      rankedOnly: false,
      unrankedOnly: false,
      passedOnly: false,
      hmd: null,
      ...(options.filters ?? {}),
    } as ScoreFilters;

    // If search is provided, get matching leaderboard IDs first
    let matchingLeaderboardIds: number[] = [];

    // Only search if the search term is at least 3 characters long
    if (search && search.length >= 3) {
      // Get leaderboard IDs that match the search
      const matchingLeaderboards = await ScoreSaberLeaderboardModel.find({
        $or: [
          { songName: { $regex: search, $options: "i" } },
          { songSubName: { $regex: search, $options: "i" } },
          { songAuthorName: { $regex: search, $options: "i" } },
          { levelAuthorName: { $regex: search, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      if (matchingLeaderboards.length === 0) {
        // No matching leaderboards, return empty result
        const pagination = new Pagination<
          PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>
        >().setItemsPerPage(8);
        pagination.setTotalItems(0);
        return pagination.getPage(1, async () => []);
      }

      matchingLeaderboardIds = matchingLeaderboards.map(lb => lb._id);
    }

    /**
     * Builds a score query.
     *
     * @param playerId the player id
     * @param filters the filters to apply
     * @param extra the extra filters to apply
     * @returns the score query
     */
    function buildScoreQuery(
      playerId: string,
      filters: ScoreFilters,
      extra: FilterQuery<ScoreSaberScore> = {}
    ): FilterQuery<ScoreSaberScore> {
      const query: FilterQuery<ScoreSaberScore> = {
        playerId,
        leaderboardId: { $exists: true, $ne: null },
        ...(mode === "medals" ? { medals: { $gt: 0 } } : {}),
        ...extra,
      };

      if (filters.rankedOnly) query.pp = { $gt: 0 };
      if (filters.unrankedOnly) query.pp = { $lte: 0 };
      if (filters.passedOnly) {
        return { ...query, modifiers: { $nin: [Modifier.NF, "NF", "No Fail"] } };
      }
      if (filters.hmd) query.hmd = filters.hmd;

      return query;
    }

    // Build the count query - must match the fetch query logic
    let countQuery = buildScoreQuery(playerId, filters, {
      ...(matchingLeaderboardIds.length > 0
        ? { leaderboardId: { $in: matchingLeaderboardIds } }
        : {}),
    });

    // Apply the same Infinity filter to count query as we do for fetch query
    // (skip for date and starcount fields)
    if (options.field && !["date", "starcount"].includes(options.field)) {
      const fieldKey = FIELDS_MAP[options.field];
      const existingFieldFilter = (countQuery as Record<string, unknown>)[fieldKey] as
        | Record<string, unknown>
        | undefined;

      countQuery = {
        ...countQuery,
        [fieldKey]: {
          ...(existingFieldFilter ?? {}),
          $ne: Infinity,
          $exists: true,
        },
      };
    }

    const totalScores = await model.countDocuments(countQuery);
    const pagination = new Pagination<
      PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>
    >().setItemsPerPage(8);
    pagination.setTotalItems(totalScores);

    /**
     * Fetches raw scores.
     *
     * @param query the query to apply
     * @param sort the sort to apply
     * @param skip the skip to apply
     * @param limit the limit to apply
     * @returns the raw scores
     */
    async function fetchRawScores(
      query: FilterQuery<ScoreSaberScore>,
      sort: ScoreSort,
      skip = 0,
      limit = 0
    ): Promise<ScoreSaberScore[]> {
      if (sort.field === "starcount") {
        const pipeline: PipelineStage[] = [
          { $match: query },
          {
            $lookup: {
              from: ScoreSaberLeaderboardModel.collection.name,
              localField: "leaderboardId",
              foreignField: "_id",
              as: "leaderboardDoc",
            },
          },
          { $unwind: "$leaderboardDoc" },
          {
            $sort: { "leaderboardDoc.stars": sort.direction === "asc" ? 1 : -1 },
          },
        ];
        if (skip) pipeline.push({ $skip: skip });
        if (limit) pipeline.push({ $limit: limit });
        pipeline.push({ $project: { leaderboardDoc: 0 } });

        return (await (model as typeof ScoreSaberScoreModel)
          .aggregate(pipeline)
          .exec()) as unknown as ScoreSaberScore[];
      }

      return (await (model as typeof ScoreSaberScoreModel)
        .find(query)
        .sort({ [FIELDS_MAP[sort.field]]: sort.direction === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean()) as unknown as ScoreSaberScore[];
    }

    /**
     * Maps raw scores to PlayerScore objects with leaderboard/BeatSaver attached
     *
     * @param rawScores the raw scores to map
     * @param includeBeatSaver whether to include the BeatSaver data
     * @returns the mapped scores
     */
    async function mapScoresWithLeaderboards(rawScores: ScoreSaberScore[]) {
      if (!rawScores.length) {
        return [];
      }

      const leaderboardResponses = await LeaderboardCoreService.getLeaderboards(
        rawScores.map(s => s.leaderboardId + ""),
        { includeBeatSaver: true }
      );

      const lbMap = new Map(leaderboardResponses.map(r => [r.leaderboard.id, r]));

      return (
        await Promise.all(
          rawScores.map(async rs => {
            const lbResp = lbMap.get(rs.leaderboardId);
            if (!lbResp) return null;
            const { leaderboard, beatsaver } = lbResp;
            return {
              score: await ScoreCoreService.insertScoreData(scoreToObject(rs), leaderboard, {
                removeScoreWeightAndRank: mode === "ssr",
              }),
              leaderboard,
              beatSaver: beatsaver,
            } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
          })
        )
      ).filter(Boolean) as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[];
    }

    return pagination.getPage(page, async ({ start, end }) => {
      // Build the base query for this page
      let query = buildScoreQuery(playerId, filters, {
        ...(matchingLeaderboardIds.length > 0
          ? { leaderboardId: { $in: matchingLeaderboardIds } }
          : {}),
      });

      // Special handling when sorting by star count
      if (options.field === "starcount") {
        // Use an aggregation pipeline so that we can sort by the leaderboard
        // star count which is not present on the score document itself.
        return await mapScoresWithLeaderboards(
          await fetchRawScores(query, options, start, end - start)
        );
      }

      // Add filter to exclude Infinity values for the sort field (skip for starcount)
      if (options.field && !["date", "starcount"].includes(options.field)) {
        const fieldKey = FIELDS_MAP[options.field];
        const existingFieldFilter = (query as Record<string, unknown>)[fieldKey] as
          | Record<string, unknown>
          | undefined;

        query = {
          ...query,
          [fieldKey]: {
            ...(existingFieldFilter ?? {}),
            $ne: Infinity,
            $exists: true,
          },
        };
      }

      return await mapScoresWithLeaderboards(
        await fetchRawScores(query, options, start, end - start)
      );
    });
  }

  /**
   * Gets the scores for a player.
   *
   * @param playerId the id of the player
   * @param page the page number
   * @param options the sort options
   * @returns the paginated scores
   */
  public static async getSSRPlayerScores(
    playerId: string,
    page: number,
    options: ScoreSort,
    search: string
  ): Promise<PlayerScoresResponse> {
    return await this.getPlayerScores("ssr", playerId, page, options, search);
  }

  /**
   * Gets the medal scores for a player.
   *
   * @param playerId the player's id.
   * @param page the page number
   * @returns the medal scores.
   */
  public static async getMedalPlayerScores(
    playerId: string,
    page: number,
    options: ScoreSort,
    search: string
  ): Promise<PlayerScoresResponse> {
    return await this.getPlayerScores("medals", playerId, page, options, search);
  }
}
