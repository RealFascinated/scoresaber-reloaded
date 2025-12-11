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
import {
  ScoreSaberMedalsScore,
  ScoreSaberMedalsScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-medals-score";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Pagination } from "@ssr/common/pagination";
import { PlayerMedalScoresResponse } from "@ssr/common/response/player-medal-scores-response";
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
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import type { PipelineStage } from "mongoose";
import { FilterQuery } from "mongoose";
import { scoreToObject } from "../../common/score/score.util";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { ScoreCoreService } from "../score/score-core.service";
import ScoreSaberService from "../scoresaber.service";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { EmbedBuilder } from "discord.js";

const FIELDS_MAP: Record<ScoreSort["field"], string> = {
  pp: "pp",
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
    partialRefresh: boolean;
  }> {
    const playerId = playerToken.id;
    const playerScoresCount = await ScoreSaberScoreModel.countDocuments({
      playerId: playerId,
    });
    if (playerScoresCount === playerToken.scoreStats.totalPlayCount) {
      return {
        missingScores: 0,
        totalScores: playerScoresCount,
        totalPagesFetched: 0,
        timeTaken: 0,
        partialRefresh: false,
      };
    }

    Logger.info(
      `%s has count mismatch: DB has %s, API reports %s. Fetching to verify...`,
      playerId,
      playerScoresCount,
      playerToken.scoreStats.totalPlayCount
    );

    const shouldDeleteScores = playerScoresCount > playerToken.scoreStats.totalPlayCount;
    if (shouldDeleteScores) {
      Logger.info(
        `Player ${playerId} has more scores than they should. Deleteing their scores and refreshing...`
      );
      await ScoreSaberScoreModel.deleteMany({
        playerId: playerId,
      });
      player.seededScores = false;
      await PlayerModel.updateOne({ _id: playerId }, { $set: { seededScores: false } });

      await sendEmbedToChannel(
        DiscordChannels.PLAYER_SCORE_REFRESH_LOGS,
        new EmbedBuilder()
          .setTitle("Player Has More Scores Than They Should!!! 🚨")
          .setDescription(
            `**${player.name}** has more scores than they should. Deleting their scores and refreshing...`
          )
          .setTimestamp()
          .setColor("#00ff00")
      );
    }

    const startTime = performance.now();
    const result = {
      missingScores: 0,
      totalScores: shouldDeleteScores ? 0 : playerScoresCount,
      totalPagesFetched: 0,
      timeTaken: 0,
      partialRefresh: false,
    };

    /**
     * Processes a page of scores.
     *
     * @param page the page to process
     * @returns whether the page has more scores to process
     */
    async function processPage(page: number): Promise<boolean> {
      result.totalPagesFetched++;
      const scoresPage = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupPlayerScores({
          playerId: playerId,
          page: page,
          limit: 100,
          sort: "recent",
          priority: CooldownPriority.BACKGROUND,
        });
      if (!scoresPage) {
        Logger.warn(`Failed to fetch scores for %s on page %s.`, playerId, page);
        return false;
      }

      for (const scoreToken of scoresPage.playerScores) {
        const leaderboard = getScoreSaberLeaderboardFromToken(scoreToken.leaderboard);
        if (!leaderboard) {
          continue;
        }
        const score = getScoreSaberScoreFromToken(scoreToken.score, leaderboard, playerId);
        if (!score) {
          continue;
        }

        const trackingResult = await ScoreCoreService.trackScoreSaberScore(
          score,
          leaderboard,
          playerToken,
          false
        );
        if (trackingResult.tracked) {
          result.missingScores++;
          result.totalScores++;
        }
      }

      // Early exit if we've found all the scores we need
      if (result.totalScores >= playerToken.scoreStats.totalPlayCount) {
        return false; // no more scores
      }
      return page < Math.ceil(scoresPage.metadata.total / scoresPage.metadata.itemsPerPage);
    }

    Logger.info(`Fetching missing scores for ${playerId}...`);
    let currentPage = 1;
    let hasMoreScores = true;
    while (hasMoreScores) {
      hasMoreScores = await processPage(currentPage);
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
    if (!result.partialRefresh) {
      Logger.info(
        `Finished fetching missing scores for %s, total pages fetched: %s, total scores: %s, missing scores: %s, in %s`,
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

    const leaderboardResponses = await LeaderboardService.getLeaderboards(
      playerScores.map(score => score.leaderboardId + ""),
      { includeBeatSaver: false, cacheOnly: true }
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

    // Start fetching comparison player and leaderboard IDs in parallel
    const [comparisonPlayer, leaderboardIds] = await Promise.all([
      comparisonPlayerId !== playerId && comparisonPlayerId !== undefined
        ? ScoreSaberService.getPlayer(
            comparisonPlayerId,
            DetailType.BASIC,
            await ScoreSaberService.getCachedPlayer(comparisonPlayerId, true),
            { setInactivesRank: false, setMedalsRank: false }
          )
        : undefined,
      requestedPage.playerScores.map(score => score.leaderboard.id + ""),
    ]);

    return await pagination.getPage(pageNumber, async () => {
      // Fetch all leaderboards in parallel using getLeaderboards
      const leaderboardResponses = await LeaderboardService.getLeaderboards(leaderboardIds, {
        includeBeatSaver: true,
        beatSaverType: DetailType.FULL,
      });

      // Create a map for quick leaderboard lookup
      const leaderboardMap = new Map(
        leaderboardResponses.map(result => [result.leaderboard.id, result])
      );

      // Process all scores in parallel with a concurrency limit
      const scorePromises = requestedPage.playerScores.map(async playerScore => {
        const leaderboardResponse = leaderboardMap.get(playerScore.leaderboard.id);
        if (!leaderboardResponse) {
          return undefined;
        }

        const { leaderboard, beatsaver } = leaderboardResponse;
        const score = getScoreSaberScoreFromToken(playerScore.score, leaderboard, playerId);
        if (!score) {
          return undefined;
        }

        // Track missing scores
        await ScoreCoreService.trackScoreSaberScore(
          score,
          leaderboard,
          await ScoreSaberService.getCachedPlayer(playerId, true),
          false
        );

        return {
          score: await ScoreCoreService.insertScoreData(score, leaderboard, comparisonPlayer),
          leaderboard: leaderboard,
          beatSaver: beatsaver,
        } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
      });

      // Wait for all score processing to complete and filter out any undefined results
      return (await Promise.all(scorePromises)).filter(Boolean) as PlayerScore<
        ScoreSaberScore,
        ScoreSaberLeaderboard
      >[];
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
  public static async getScoreSaberCachedPlayerScores(
    playerId: string,
    page: number,
    options: ScoreSort,
    search?: string
  ): Promise<PlayerScoresResponse> {
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

      matchingLeaderboardIds = matchingLeaderboards.map((lb: { _id: number }) => lb._id);
    }

    const totalScores = await ScoreSaberScoreModel.countDocuments(
      buildScoreQuery(playerId, filters, {
        ...(matchingLeaderboardIds.length > 0
          ? { leaderboardId: { $in: matchingLeaderboardIds } }
          : {}),
      })
    );
    const pagination = new Pagination<
      PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>
    >().setItemsPerPage(8);
    pagination.setTotalItems(totalScores);

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
        const rawScores = await fetchRawScores(query, options, start, end - start);

        return await mapScoresWithLeaderboards(rawScores, false, false, true);
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

      // Filter scores based on the filters
      if (filters.rankedOnly) {
        query.pp = { $gt: 0 };
      }
      if (filters.unrankedOnly) {
        query.pp = { $lte: 0 };
      }
      if (filters.passedOnly) {
        query = { ...query, modifiers: { $nin: [Modifier.NF, "NF", "No Fail"] } };
      }
      if (filters.hmd) {
        query.hmd = filters.hmd;
      }

      const rawScores = await fetchRawScores(query, options, start, end - start);

      return await mapScoresWithLeaderboards(rawScores);
    });
  }

  /**
   * Gets the medal scores for a player.
   *
   * @param playerId the player's id.
   * @param page the page number
   * @returns the medal scores.
   */
  public static async getPlayerMedalScores(
    playerId: string,
    page: number = 1
  ): Promise<PlayerMedalScoresResponse> {
    const totalScores = await ScoreSaberMedalsScoreModel.countDocuments({
      playerId,
    });
    if (totalScores === 0) {
      return Pagination.empty<PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard>>();
    }

    const pagination = new Pagination<PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(8)
      .setTotalItems(totalScores);

    return pagination.getPage(page, async ({ start, end }) => {
      const rawScores = (await ScoreSaberMedalsScoreModel.find({ playerId })
        .skip(start)
        .limit(end - start)
        .sort({ medals: -1, timestamp: -1 }) // Sort by medals and timestamp in descending order
        .lean()) as unknown as ScoreSaberMedalsScore[];

      // Get leaderboards for the scores we have
      const leaderboardResponses = await LeaderboardService.getLeaderboards(
        rawScores.map(score => score.leaderboardId + ""),
        {
          includeBeatSaver: true,
          cacheOnly: true,
        }
      );

      const leaderboardMapForScores = new Map(
        leaderboardResponses.map(response => [response.leaderboard.id, response])
      );

      // Process scores in parallel - return PlayerScore objects
      const processedScores = await Promise.all(
        rawScores.map(async rawScore => {
          const leaderboardResponse = leaderboardMapForScores.get(rawScore.leaderboardId);
          if (!leaderboardResponse) {
            return null;
          }
          const { leaderboard, beatsaver } = leaderboardResponse;

          const score = (await ScoreCoreService.insertScoreData(
            scoreToObject(rawScore),
            leaderboard
          )) as unknown as ScoreSaberMedalsScore;
          return {
            score: score,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          } as PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard>;
        })
      );

      return processedScores.filter(
        (score): score is PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard> =>
          score !== null
      );
    });
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

    const leaderboardResponse = await LeaderboardService.getLeaderboard(
      rawScore.leaderboardId + "",
      {
        cacheOnly: true,
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
      undefined,
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
}

// Build a base query object from common filter flags
function buildScoreQuery(
  playerId: string,
  filters: ScoreFilters,
  extra: FilterQuery<ScoreSaberScore> = {}
): FilterQuery<ScoreSaberScore> {
  const query: FilterQuery<ScoreSaberScore> = {
    playerId,
    leaderboardId: { $exists: true, $ne: null },
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

// Retrieve raw score documents with optional star-count sorting
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

    return (await ScoreSaberScoreModel.aggregate(pipeline).exec()) as unknown as ScoreSaberScore[];
  }

  return (await ScoreSaberScoreModel.find(query)
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
 * @param cacheOnly whether to only use cached leaderboards
 * @returns the mapped scores
 */
async function mapScoresWithLeaderboards(
  rawScores: ScoreSaberScore[],
  includeBeatSaver = true,
  cacheOnly = true,
  removeScoreWeightAndRank = true
) {
  if (!rawScores.length) return [];

  const leaderboardResponses = await LeaderboardService.getLeaderboards(
    rawScores.map(s => s.leaderboardId + ""),
    { includeBeatSaver, cacheOnly }
  );

  const lbMap = new Map(leaderboardResponses.map(r => [r.leaderboard.id, r]));

  const processed = await Promise.all(
    rawScores.map(async rs => {
      const lbResp = lbMap.get(rs.leaderboardId);
      if (!lbResp) return null;
      const { leaderboard, beatsaver } = lbResp;
      const score = await ScoreCoreService.insertScoreData(
        scoreToObject(rs),
        leaderboard,
        undefined,
        {
          removeScoreWeightAndRank,
        }
      );
      return { score, leaderboard, beatSaver: beatsaver } as PlayerScore<
        ScoreSaberScore,
        ScoreSaberLeaderboard
      >;
    })
  );

  return processed.filter(Boolean) as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[];
}
