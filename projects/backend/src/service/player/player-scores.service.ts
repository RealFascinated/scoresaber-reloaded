import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { Player } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import type {
  AccSaberScoreOrder,
  AccSaberScoreSort,
  AccSaberScoreType,
} from "@ssr/common/schemas/accsaber/tokens/query/query";
import { AccSaberScore } from "@ssr/common/schemas/accsaber/tokens/score/score";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import {
  PlayerScoreChartDataPoint,
  PlayerScoresChartResponse,
} from "@ssr/common/schemas/response/player/scores-chart";
import { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { ScoreQuery, SortDirection, SortField } from "@ssr/common/types/score-query";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import ScoreSaberPlayerScoresPageToken from "@ssr/common/types/token/scoresaber/player-scores-page";
import { accSaberDifficultyToMapDifficulty } from "@ssr/common/utils/accsaber-difficulty";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { db } from "../../db";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { fetchScoresWithLeaderboards } from "../../db/fetch-scores-with-leaderboards";
import { scoreSaberLeaderboardsTable, scoreSaberScoresTable } from "../../db/schema";
import BeatLeaderService from "../beatleader.service";
import BeatSaverService from "../beatsaver.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import { PlayerCoreService } from "./player-core.service";

function playerScoresOrderBy(
  sort: SortField,
  direction: SortDirection,
  scores: typeof scoreSaberScoresTable,
  leaderboards: typeof scoreSaberLeaderboardsTable
) {
  const sortOrder = direction === "asc" ? asc : desc;
  switch (sort) {
    case "pp":
      return sortOrder(scores.pp);
    case "score":
      return sortOrder(scores.score);
    case "acc":
      return sortOrder(scores.accuracy);
    case "misses":
      return sortOrder(sql`${scores.missedNotes} + ${scores.badCuts}`);
    case "maxcombo":
      return sortOrder(scores.maxCombo);
    case "date":
      return sortOrder(scores.timestamp);
    case "medals":
      return sortOrder(sql`coalesce(${leaderboards.stars}, 0)`);
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

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
    if (player.banned) {
      if (!player.seededScores) {
        await PlayerCoreService.updatePlayer(player._id, { seededScores: true });
      }
      return {
        missingScores: 0,
        totalScores: 0,
        totalPagesFetched: 0,
        timeTaken: 0,
      };
    }

    const startTime = performance.now();
    const playerId = playerToken.id;
    const playerScoresCount = await ScoreSaberScoreModel.countDocuments({
      playerId: playerId,
    });

    // The player has the correct number of scores
    if (playerScoresCount === playerToken.scoreStats.totalPlayCount) {
      // Mark player as seeded
      if (!player.seededScores) {
        await PlayerCoreService.updatePlayer(player._id, { seededScores: true });
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
    async function getScoresPage(page: number): Promise<ScoreSaberPlayerScoresPageToken | undefined> {
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
      await PlayerCoreService.updatePlayer(playerId, { seededScores: false });

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
      await PlayerCoreService.updatePlayer(player._id, { seededScores: true });
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
    const rows = await db
      .select({
        accuracy: scoreSaberScoresTable.accuracy,
        pp: scoreSaberScoresTable.pp,
        timestamp: scoreSaberScoresTable.timestamp,
        leaderboardId: scoreSaberLeaderboardsTable.id,

        songName: scoreSaberLeaderboardsTable.songName,
        stars: scoreSaberLeaderboardsTable.stars,
        leaderboardDifficulty: scoreSaberLeaderboardsTable.difficulty,
      })
      .from(scoreSaberScoresTable)
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)));

    if (!rows.length) {
      return {
        data: [],
      };
    }

    const data: PlayerScoreChartDataPoint[] = rows.map(row => ({
      accuracy: row.accuracy,
      stars: row.stars ?? 0,
      pp: row.pp,
      timestamp: row.timestamp,
      leaderboardId: row.leaderboardId,
      leaderboardName: row.songName,
      leaderboardDifficulty: getDifficultyName(
        getDifficulty(MapDifficultySchema.parse(row.leaderboardDifficulty))
      ),
    }));

    return {
      data,
    };
  }

  /**
   * Gets a score by its ID.
   *
   * @param scoreId the id of the score
   * @returns the score
   */
  public static async getScore(scoreId: number): Promise<PlayerScore> {
    const [scoreResult] = await Promise.all([
      db
        .select()
        .from(scoreSaberScoresTable)
        .innerJoin(
          scoreSaberLeaderboardsTable,
          eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
        )
        .where(eq(scoreSaberScoresTable.id, scoreId))
        .limit(1),
    ]);

    if (!scoreResult.length) {
      throw new NotFoundError("Score not found");
    }

    const { "scoresaber-scores": rawScore, "scoresaber-leaderboards": rawLeaderboard } = scoreResult[0];

    const leaderboardMap = await LeaderboardCoreService.getLeaderboardsWithDifficultiesByIds([
      rawLeaderboard.id,
    ]);
    const leaderboard = leaderboardMap.get(rawLeaderboard.id);
    if (!leaderboard) {
      throw new NotFoundError("Leaderboard not found");
    }
    const score = scoreSaberScoreRowToType(rawScore);

    const enrichedScore = await ScoreCoreService.insertScoreData(score, leaderboard, {
      insertPlayerInfo: true,
      insertBeatLeaderScore: true,
    });

    return {
      score: enrichedScore,
      leaderboard,
      beatSaver: await BeatSaverService.getMap(
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        "full"
      ),
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
    search?: string
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

    return await pagination.getPage(pageNumber, async () => {
      const scores = await Promise.all(
        requestedPage.playerScores.map(async playerScore => {
          const leaderboard = getScoreSaberLeaderboardFromToken(playerScore.leaderboard);

          return {
            score: await ScoreCoreService.insertScoreData(
              getScoreSaberScoreFromToken(playerScore.score, leaderboard, playerId),
              leaderboard
            ),
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
   * AccSaber player scores from GraphQL, enriched with BeatLeader score data when available (replay, hand acc, etc.).
   */
  public static async getAccSaberEnrichedPlayerScores(
    playerId: string,
    pageNumber: number,
    sort: AccSaberScoreSort,
    order: AccSaberScoreOrder,
    type: AccSaberScoreType
  ): Promise<Page<AccSaberScore>> {
    const requested = await ApiServiceRegistry.getInstance()
      .getAccSaberService()
      .getPlayerScores(playerId, pageNumber, { sort, order, type });

    const items: AccSaberScore[] = await Promise.all(
      requested.items.map(async row => {
        const songHash = row.leaderboard.song.hash;
        const difficulty = accSaberDifficultyToMapDifficulty(row.leaderboard.diffInfo.diff);
        const characteristic = (row.leaderboard.diffInfo.type ?? "Standard") as MapCharacteristic;
        const songScore = row.score.unmodifiedScore;

        const beatLeaderScore = await BeatLeaderService.getBeatLeaderScoreFromSong(
          playerId,
          songHash,
          difficulty,
          characteristic,
          songScore
        );

        return beatLeaderScore ? { ...row, beatLeaderScore } : { ...row };
      })
    );

    return {
      items,
      metadata: requested.metadata,
    };
  }

  public static async getPlayerScores(
    mode: "ssr" | "medals",
    playerId: string,
    page: number,
    sort: SortField,
    direction: SortDirection,
    filters: ScoreQuery
  ) {
    const leaderboardIds = await LeaderboardCoreService.searchLeaderboardIds(filters.search ?? "");
    if (leaderboardIds == null) {
      return new Pagination<PlayerScore>().setItemsPerPage(8).getPage(1, async () => []);
    }

    const limit = 8;
    const offset = (page - 1) * limit;

    function buildConditions() {
      const uniquePlayerIds = Array.from(new Set([playerId, ...(filters.includePlayers || [])]));
      const conditions = [inArray(scoreSaberScoresTable.playerId, uniquePlayerIds)];

      if (sort === "acc") {
        conditions.push(isNotNull(scoreSaberScoresTable.accuracy), gte(scoreSaberScoresTable.accuracy, 0));
      }

      if (leaderboardIds && leaderboardIds.length > 0) {
        conditions.push(inArray(scoreSaberScoresTable.leaderboardId, leaderboardIds));
      }

      if (filters.hmd) {
        conditions.push(eq(scoreSaberScoresTable.hmd, filters.hmd));
      }

      return conditions;
    }

    const conditions = buildConditions();

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoresTable)
      .where(and(...conditions));

    const pagination = new Pagination<PlayerScore>().setItemsPerPage(limit).setTotalItems(count);

    return pagination.getPage(page, async () => {
      if (sort === "medals") {
        const rawScores = await db
          .select()
          .from(scoreSaberScoresTable)
          .innerJoin(
            scoreSaberLeaderboardsTable,
            eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
          )
          .where(and(...conditions))
          .orderBy(playerScoresOrderBy(sort, direction, scoreSaberScoresTable, scoreSaberLeaderboardsTable))
          .limit(limit)
          .offset(offset);

        const pageLeaderboardIds = [...new Set(rawScores.map(r => r["scoresaber-leaderboards"].id))];
        const leaderboardMap =
          await LeaderboardCoreService.getLeaderboardsWithDifficultiesByIds(pageLeaderboardIds);

        return (
          await Promise.all(
            rawScores.map(
              async ({ "scoresaber-scores": rawScore, "scoresaber-leaderboards": rawLeaderboard }) => {
                const leaderboard = leaderboardMap.get(rawLeaderboard.id);
                if (!leaderboard) {
                  return undefined;
                }
                const score = scoreSaberScoreRowToType(rawScore);

                return {
                  score: await ScoreCoreService.insertScoreData(score, leaderboard),
                  leaderboard,
                  beatSaver: await BeatSaverService.getMap(
                    leaderboard.songHash,
                    leaderboard.difficulty.difficulty,
                    leaderboard.difficulty.characteristic,
                    "full"
                  ),
                } as PlayerScore;
              }
            )
          )
        ).filter(Boolean) as PlayerScore[];
      }

      const scored = await fetchScoresWithLeaderboards({
        where: and(...conditions),
        orderBy: s => [playerScoresOrderBy(sort, direction, s, scoreSaberLeaderboardsTable)],
        limit,
        offset,
      });

      return Promise.all(
        scored.map(async ({ scoreRow, leaderboard }) => ({
          score: await ScoreCoreService.insertScoreData(scoreSaberScoreRowToType(scoreRow), leaderboard),
          leaderboard,
          beatSaver: await BeatSaverService.getMap(
            leaderboard.songHash,
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic,
            "full"
          ),
        }))
      );
    });
  }
}
