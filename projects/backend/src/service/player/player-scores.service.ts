import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import type {
  AccSaberScoreOrder,
  AccSaberScoreSort,
  AccSaberScoreType,
} from "@ssr/common/schemas/accsaber/tokens/query/query";
import { AccSaberScore } from "@ssr/common/schemas/accsaber/tokens/score/score";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { PlayerScoresChartResponse } from "@ssr/common/schemas/response/player/scores-chart";
import { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { PlayerScoresQuery } from "@ssr/common/schemas/score/query/player-scores-query";
import { ScoreSaberMedalScoreSortField } from "@ssr/common/schemas/score/query/sort/scoresaber-medal-scores-sort";
import type { ScoreSaberScoreSortField } from "@ssr/common/schemas/score/query/sort/scoresaber-scores-sort";
import type { SortDirection } from "@ssr/common/schemas/score/query/sort/sort-direction";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import ScoreSaberPlayerScoresPageToken from "@ssr/common/types/token/scoresaber/player-scores-page";
import { accSaberDifficultyToMapDifficulty } from "@ssr/common/utils/accsaber-difficulty";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { db } from "../../db";
import { scoreSaberMedalScoreRowToType } from "../../db/converter/medal-score";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import {
  scoreSaberLeaderboardsTable,
  scoreSaberMedalScoresTable,
  scoreSaberScoresTable,
} from "../../db/schema";
import BeatLeaderService from "../beatleader.service";
import BeatSaverService from "../beatsaver.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { MedalScoresService } from "../score/medal-scores.service";
import { ScoreCoreService } from "../score/score-core.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import { PlayerCoreService } from "./player-core.service";

export class PlayerScoresService {
  /**
   * Fetches missing scores for a player.
   *
   * @param player the player to refresh scores for
   * @param playerToken the player's token
   * @returns the result of the fetch
   */
  public static async fetchMissingPlayerScores(
    account: ScoreSaberAccount,
    playerToken: ScoreSaberPlayerToken
  ): Promise<{
    missingScores: number;
    totalScores: number;
    totalPagesFetched: number;
    timeTaken: number;
  }> {
    if (account.banned) {
      if (!account.seededScores) {
        await PlayerCoreService.updatePlayer(account.id, { seededScores: true });
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
    const playerScoresCount = await PlayerScoresService.getPlayerScoresCount(playerId);

    // The player has the correct number of scores
    if (playerScoresCount === playerToken.scoreStats.totalPlayCount) {
      // Mark player as seeded
      if (!account.seededScores) {
        await PlayerCoreService.updatePlayer(account.id, { seededScores: true });
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

      await db.delete(scoreSaberScoresTable).where(eq(scoreSaberScoresTable.playerId, playerId));
      result.totalScores = 0;

      account.seededScores = false;
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
          undefined,
          leaderboard,
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
    if (!account.seededScores) {
      await PlayerCoreService.updatePlayer(account.id, { seededScores: true });
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
        difficulty: scoreSaberLeaderboardsTable.difficulty,

        songName: scoreSaberLeaderboardsTable.songName,
        stars: scoreSaberLeaderboardsTable.stars,
      })
      .from(scoreSaberScoresTable)
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)))
      .orderBy(desc(scoreSaberScoresTable.timestamp));

    if (!rows.length) {
      return {
        data: [],
      };
    }

    return {
      data: rows.map(row => ({
        accuracy: row.accuracy,
        stars: row.stars ?? 0,
        pp: row.pp,
        timestamp: row.timestamp,
        leaderboardId: row.leaderboardId,
        leaderboardName: row.songName,
        leaderboardDifficulty: row.difficulty,
      })),
    };
  }

  /**
   * Gets a score by its ID.
   *
   * @param scoreId the id of the score
   * @returns the score
   */
  public static async getScore(scoreId: number): Promise<PlayerScore<ScoreSaberScore>> {
    const [scoreResult] = await Promise.all([
      db
        .select()
        .from(scoreSaberScoresTable)
        .innerJoin(
          scoreSaberLeaderboardsTable,
          eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
        )
        .where(eq(scoreSaberScoresTable.scoreId, scoreId))
        .limit(1),
    ]);

    if (!scoreResult.length) {
      throw new NotFoundError("Score not found");
    }

    const { "scoresaber-scores": rawScore, "scoresaber-leaderboards": rawLeaderboard } = scoreResult[0];

    const leaderboard = await LeaderboardCoreService.getLeaderboard(rawLeaderboard.id);
    if (!leaderboard) {
      throw new NotFoundError("Leaderboard not found");
    }
    const score = scoreSaberScoreRowToType(rawScore);

    const [enrichedScore, beatSaver] = await Promise.all([
      ScoreCoreService.insertScoreData(score, leaderboard),
      BeatSaverService.getMap(
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic
      ),
    ]);
    return { score: enrichedScore, leaderboard, beatSaver };
  }

  /**
   * Gets the number of scores for a player.
   *
   * @param playerId the player's id
   * @returns the number of scores
   */
  public static async getPlayerScoresCount(playerId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.playerId, playerId));
    return row?.count ?? 0;
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
      return Pagination.empty<PlayerScore<ScoreSaberScore>>();
    }

    const pagination = new Pagination<PlayerScore<ScoreSaberScore>>()
      .setItemsPerPage(requestedPage.metadata.itemsPerPage)
      .setTotalItems(requestedPage.metadata.total);

    return await pagination.getPage(pageNumber, async () => {
      const scores = await Promise.all(
        requestedPage.playerScores.map(async playerScore => {
          const leaderboard = getScoreSaberLeaderboardFromToken(playerScore.leaderboard);

          const [enrichedScore, beatSaver] = await Promise.all([
            ScoreCoreService.insertScoreData(
              getScoreSaberScoreFromToken(playerScore.score, leaderboard, playerId),
              leaderboard,
              {
                insertPlayerInfo: false,
                insertPreviousScore: true,
                insertBeatLeaderScore: true,
              }
            ),
            BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic
            ),
          ]);
          return { score: enrichedScore, leaderboard, beatSaver };
        })
      );
      return scores.filter(Boolean) as PlayerScore<ScoreSaberScore>[];
    });
  }

  /**
   * Gets the player's AccSaber scores.
   *
   * @param playerId the player's id
   * @param pageNumber the page to get
   * @param sort the sort to get
   * @param order the order to get
   * @param type the type to get
   * @returns the player's AccSaber scores
   */
  public static async getPlayerAccSaberScores(
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

        return { ...row, beatLeaderScore };
      })
    );

    return {
      items,
      metadata: requested.metadata,
    };
  }

  /**
   * Gets the player's scores.
   *
   * @param playerId the player's id
   * @param page the page to get
   * @param sort the sort to get
   * @param direction the direction to get
   * @param query the filters to get
   * @returns the player's scores
   */
  public static async getScoreSaberPlayerScores(
    playerId: string,
    page: number,
    sort: ScoreSaberScoreSortField,
    direction: SortDirection,
    query: PlayerScoresQuery
  ) {
    const leaderboardIds = await LeaderboardCoreService.searchLeaderboardIds(query.search ?? "");
    if (leaderboardIds == null) {
      return new Pagination<PlayerScore<ScoreSaberScore>>().setItemsPerPage(8).getPage(1, async () => []);
    }

    const limit = 8;
    const offset = (page - 1) * limit;

    function buildConditions() {
      const uniquePlayerIds = Array.from(new Set([playerId, ...(query.playerIds || [])]));
      const conditions = [inArray(scoreSaberScoresTable.playerId, uniquePlayerIds)];

      if (sort === "acc") {
        conditions.push(isNotNull(scoreSaberScoresTable.accuracy), gte(scoreSaberScoresTable.accuracy, 0));
      }

      if (leaderboardIds && leaderboardIds.length > 0) {
        conditions.push(inArray(scoreSaberScoresTable.leaderboardId, leaderboardIds));
      }

      if (query.hmd) {
        conditions.push(eq(scoreSaberScoresTable.hmd, query.hmd));
      }

      return conditions;
    }

    const conditions = buildConditions();

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoresTable)
      .where(and(...conditions));

    const pagination = new Pagination<PlayerScore<ScoreSaberScore>>()
      .setItemsPerPage(limit)
      .setTotalItems(count);

    return pagination.getPage(page, async () => {
      const sortOrder = direction === "asc" ? asc : desc;
      let orderByColumn: Parameters<typeof sortOrder>[0];
      switch (sort) {
        case "pp":
          orderByColumn = scoreSaberScoresTable.pp;
          break;
        case "acc":
          orderByColumn = scoreSaberScoresTable.accuracy;
          break;
        case "score":
          orderByColumn = scoreSaberScoresTable.score;
          break;
        case "misses":
          orderByColumn = sql`${scoreSaberScoresTable.missedNotes} + ${scoreSaberScoresTable.badCuts}`;
          break;
        case "maxcombo":
          orderByColumn = scoreSaberScoresTable.maxCombo;
          break;
        case "date":
          orderByColumn = scoreSaberScoresTable.timestamp;
          break;
        default: {
          const _exhaustive: never = sort;
          return _exhaustive;
        }
      }

      const scoresRows = await db
        .select()
        .from(scoreSaberScoresTable)
        .where(and(...conditions))
        .orderBy(sortOrder(orderByColumn))
        .limit(limit)
        .offset(offset);

      if (!scoresRows.length) {
        return [];
      }

      const leaderboards = await LeaderboardCoreService.getLeaderboardsWithDifficultiesByIds(
        scoresRows.map(scoreRow => scoreRow.leaderboardId)
      );
      const scores = await Promise.all(
        scoresRows.map(async scoreRow => {
          const leaderboard = leaderboards.get(scoreRow.leaderboardId);
          if (!leaderboard) {
            return undefined;
          }
          const [enrichedScore, beatSaver] = await Promise.all([
            ScoreCoreService.insertScoreData(scoreSaberScoreRowToType(scoreRow), leaderboard),
            BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic
            ),
          ]);
          return { score: enrichedScore, leaderboard, beatSaver };
        })
      );
      return scores.filter(Boolean) as PlayerScore<ScoreSaberScore>[];
    });
  }

  /**
   * Gets the player's scores.
   *
   * @param playerId the player's id
   * @param page the page to get
   * @param sort the sort to get
   * @param direction the direction to get
   * @param query the filters to get
   * @returns the player's scores
   */
  public static async getScoreSaberPlayerMedalScores(
    playerId: string,
    page: number,
    sort: ScoreSaberMedalScoreSortField,
    direction: SortDirection,
    query: PlayerScoresQuery
  ) {
    const leaderboardIds = await LeaderboardCoreService.searchLeaderboardIds(query.search ?? "");
    if (leaderboardIds == null) {
      return new Pagination<PlayerScore<ScoreSaberMedalScore>>()
        .setItemsPerPage(8)
        .getPage(1, async () => []);
    }

    const limit = 8;
    const offset = (page - 1) * limit;

    function buildConditions() {
      const uniquePlayerIds = Array.from(new Set([playerId, ...(query.playerIds || [])]));
      const conditions = [inArray(scoreSaberMedalScoresTable.playerId, uniquePlayerIds)];

      if (sort === "acc") {
        conditions.push(
          isNotNull(scoreSaberMedalScoresTable.accuracy),
          gte(scoreSaberMedalScoresTable.accuracy, 0)
        );
      }

      if (leaderboardIds && leaderboardIds.length > 0) {
        conditions.push(inArray(scoreSaberMedalScoresTable.leaderboardId, leaderboardIds));
      }

      if (query.hmd) {
        conditions.push(eq(scoreSaberMedalScoresTable.hmd, query.hmd));
      }

      return conditions;
    }

    // todo: handle medals mode

    const conditions = buildConditions();

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberMedalScoresTable)
      .where(and(...conditions));

    const pagination = new Pagination<PlayerScore<ScoreSaberMedalScore>>()
      .setItemsPerPage(limit)
      .setTotalItems(count);

    return pagination.getPage(page, async () => {
      const sortOrder = direction === "asc" ? asc : desc;
      let orderByColumn: Parameters<typeof sortOrder>[0];
      switch (sort) {
        case "medals":
          orderByColumn = scoreSaberMedalScoresTable.medals;
          break;
        case "acc":
          orderByColumn = scoreSaberMedalScoresTable.accuracy;
          break;
        case "score":
          orderByColumn = scoreSaberMedalScoresTable.score;
          break;
        case "misses":
          orderByColumn = sql`${scoreSaberMedalScoresTable.missedNotes} + ${scoreSaberMedalScoresTable.badCuts}`;
          break;
        case "maxcombo":
          orderByColumn = scoreSaberMedalScoresTable.maxCombo;
          break;
        case "date":
          orderByColumn = scoreSaberMedalScoresTable.timestamp;
          break;
        default: {
          const _exhaustive: never = sort;
          return _exhaustive;
        }
      }

      const scoresRows = await db
        .select()
        .from(scoreSaberMedalScoresTable)
        .where(and(...conditions))
        .orderBy(sortOrder(orderByColumn))
        .limit(limit)
        .offset(offset);

      if (!scoresRows.length) {
        return [];
      }

      const [rankByScoreId, leaderboards] = await Promise.all([
        MedalScoresService.getMedalTableScoreRanksForScores(
          scoresRows.map(r => ({ scoreId: r.scoreId, leaderboardId: r.leaderboardId }))
        ),
        LeaderboardCoreService.getLeaderboardsWithDifficultiesByIds(
          scoresRows.map(scoreRow => scoreRow.leaderboardId)
        ),
      ]);

      const scores = await Promise.all(
        scoresRows.map(async scoreRow => {
          const leaderboard = leaderboards.get(scoreRow.leaderboardId);
          if (!leaderboard) {
            return undefined;
          }
          const medalScore: ScoreSaberMedalScore = {
            ...scoreSaberMedalScoreRowToType(scoreRow),
            rank: rankByScoreId.get(scoreRow.scoreId) ?? 0,
          };
          const [enrichedScore, beatSaver] = await Promise.all([
            ScoreCoreService.insertScoreData(medalScore, leaderboard),
            BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic
            ),
          ]);
          return { score: enrichedScore, leaderboard, beatSaver };
        })
      );
      return scores.filter(Boolean) as PlayerScore<ScoreSaberMedalScore>[];
    });
  }

  /**
   * Gets the total number of scores.
   *
   * @returns the approximate total number of scores
   */
  public static async getTotalScoresCount(): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT GREATEST(0, reltuples)::bigint::integer AS count
      FROM pg_class
      WHERE oid = 'scoresaber-scores'::regclass
    `);
    return Number(result.rows[0]?.count ?? 0);
  }
}
