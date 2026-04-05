import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
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
import { type AnyColumn, SQL, asc, desc, eq, gt, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { scoreSaberMedalScoreRowToType } from "../../db/converter/medal-score";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { scoreSaberScoresTable } from "../../db/schema";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import BeatLeaderService from "../beatleader/beatleader.service";
import BeatSaverService from "../external/beatsaver.service";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { ScoreCoreService } from "../score/score-core.service";
import { PlayerCoreService } from "./player-core.service";

/**
 * Describes how to paginate and enrich a specific score table.
 */
type ScoreTableConfig<TRow, TScore> = {
  buildConditions: (playerIds: string[], leaderboardIds: number[] | null, hmd?: HMD) => SQL[];
  countRows: (conditions: SQL[]) => Promise<number>;
  resolveOrderColumn: (sort: string) => AnyColumn | SQL;
  fetchRows: (conditions: SQL[], orderBy: SQL, limit: number, offset: number) => Promise<TRow[]>;
  getLeaderboardId: (row: TRow) => number;
  enrichRow: (row: TRow, leaderboard: ScoreSaberLeaderboard) => Promise<PlayerScore<TScore> | undefined>;
};

export class PlayerScoresService {
  private static readonly logger: ScopedLogger = Logger.withTopic("ScoreSaber Player Scores");

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
    const playerScoresCount = await ScoreSaberScoresRepository.countByPlayerId(playerId);

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

    async function getScoresPage(page: number): Promise<ScoreSaberPlayerScoresPageToken | undefined> {
      return ScoreSaberApiService.lookupPlayerScores({
        playerId: playerId,
        page: page,
        limit: 100,
        sort: "recent",
      });
    }

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

    async function processPage(
      currentPage: number,
      scoresPage: ScoreSaberPlayerScoresPageToken
    ): Promise<boolean> {
      await Promise.all(
        scoresPage.playerScores.map(async scoreToken => {
          const { score, leaderboard } = parseScoreToken(scoreToken);
          if (!score || !leaderboard) {
            result.totalScores++;
            return;
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
        })
      );

      if (result.totalScores >= scoresPage.metadata.total) {
        return false;
      }

      return currentPage < Math.ceil(scoresPage.metadata.total / scoresPage.metadata.itemsPerPage);
    }

    let currentPage = 1;
    let hasMoreScores = true;
    let pagesFetched = 0;
    while (hasMoreScores) {
      const scoresPage = await getScoresPage(currentPage);
      if (!scoresPage) {
        hasMoreScores = false;
        continue;
      }

      pagesFetched++;
      hasMoreScores = await processPage(currentPage, scoresPage);
      if (!hasMoreScores) {
        break;
      }
      currentPage++;
    }

    if (!account.seededScores) {
      await PlayerCoreService.updatePlayer(account.id, { seededScores: true });
    }

    result.timeTaken = performance.now() - startTime;
    result.totalPagesFetched = pagesFetched;
    PlayerScoresService.logger.info(
      `Fetched missing scores for %s, total pages fetched: %s, total scores: %s, missing scores: %s, in %s`,
      playerId,
      formatNumberWithCommas(result.totalPagesFetched),
      formatNumberWithCommas(result.totalScores),
      formatNumberWithCommas(result.missingScores),
      formatDuration(result.timeTaken)
    );
    return result;
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player's id
   */
  public static async getPlayerScoreChart(playerId: string): Promise<PlayerScoresChartResponse> {
    const rows = await ScoreSaberScoresRepository.getChartRowsByPlayer(playerId);

    if (!rows.length) {
      return { data: [] };
    }

    return {
      data: rows.map(row => ({
        accuracy: row.accuracy,
        stars: row.stars ?? 0,
        pp: row.pp,
        timestamp: row.timestamp,
        leaderboardId: row.leaderboardId,
        leaderboardName: row.songName ?? "",
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
    const scoreRow = await ScoreSaberScoresRepository.findRowByScoreId(scoreId);
    if (!scoreRow) {
      throw new NotFoundError("Score not found");
    }

    const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(scoreRow.leaderboardId);
    const [score, beatSaver] = await Promise.all([
      ScoreCoreService.insertScoreData(scoreSaberScoreRowToType(scoreRow), leaderboard),
      BeatSaverService.getMap(
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic
      ),
    ]);
    return { score, leaderboard, beatSaver };
  }

  /**
   * Looks up player scores from the live ScoreSaber API.
   */
  public static async getScoreSaberLivePlayerScores(
    playerId: string,
    pageNumber: number,
    sort: string,
    search?: string
  ): Promise<PlayerScoresPageResponse> {
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

    return { items, metadata: requested.metadata };
  }

  private static async getPaginatedPlayerScores<TRow, TScore>(
    playerId: string,
    page: number,
    sort: string,
    direction: SortDirection,
    query: PlayerScoresQuery,
    config: ScoreTableConfig<TRow, TScore>
  ): Promise<Page<PlayerScore<TScore>>> {
    const limit = 8;
    const offset = (page - 1) * limit;
    const uniquePlayerIds = Array.from(new Set([playerId, ...(query.playerIds ?? [])]));

    // Only search leaderboards if a query is given; null means no filter
    let leaderboardIds: number[] | null = null;
    if (query.search?.trim()) {
      const ids = await ScoreSaberLeaderboardsRepository.searchLeaderboardIds(query.search);
      if (ids.length === 0) return Pagination.empty<PlayerScore<TScore>>();
      leaderboardIds = ids;
    }

    const conditions = config.buildConditions(uniquePlayerIds, leaderboardIds, query.hmd);
    const total = await config.countRows(conditions);
    const pagination = new Pagination<PlayerScore<TScore>>().setItemsPerPage(limit).setTotalItems(total);

    return pagination.getPage(page, async () => {
      const sortOrder = direction === "asc" ? asc : desc;
      const rows = await config.fetchRows(
        conditions,
        sortOrder(config.resolveOrderColumn(sort)),
        limit,
        offset
      );
      if (!rows.length) return [];

      // Batch-fetch leaderboards for this page only
      const leaderboardIdSet = [...new Set(rows.map(config.getLeaderboardId))];
      const leaderboards = await Promise.all(
        leaderboardIdSet.map(id => ScoreSaberLeaderboardsRepository.getLeaderboardById(id, false))
      );
      const leaderboardMap = new Map(leaderboards.flatMap(lb => (lb ? [[lb.id, lb]] : [])));

      const scores = await Promise.all(
        rows.map(async row => {
          const leaderboard = leaderboardMap.get(config.getLeaderboardId(row));
          if (!leaderboard) return undefined;
          return config.enrichRow(row, leaderboard);
        })
      );

      return scores.filter(Boolean) as PlayerScore<TScore>[];
    });
  }

  /**
   * Gets the player's ScoreSaber scores from the database.
   */
  public static async getScoreSaberPlayerScores(
    playerId: string,
    page: number,
    sort: ScoreSaberScoreSortField,
    direction: SortDirection,
    query: PlayerScoresQuery
  ) {
    return PlayerScoresService.getPaginatedPlayerScores(playerId, page, sort, direction, query, {
      buildConditions(playerIds, leaderboardIds, hmd) {
        const conditions: SQL[] = [inArray(scoreSaberScoresTable.playerId, playerIds)];

        if (sort === "acc") {
          conditions.push(isNotNull(scoreSaberScoresTable.accuracy), gte(scoreSaberScoresTable.accuracy, 0));
        }
        if (leaderboardIds && leaderboardIds.length > 0) {
          conditions.push(inArray(scoreSaberScoresTable.leaderboardId, leaderboardIds));
        }
        if (hmd) {
          conditions.push(eq(scoreSaberScoresTable.hmd, hmd));
        }

        return conditions;
      },

      async countRows(conditions) {
        return ScoreSaberScoresRepository.countByConditions(conditions);
      },

      resolveOrderColumn(sort) {
        switch (sort as ScoreSaberScoreSortField) {
          case "pp":
            return scoreSaberScoresTable.pp;
          case "acc":
            return scoreSaberScoresTable.accuracy;
          case "score":
            return scoreSaberScoresTable.score;
          case "misses":
            return sql`${scoreSaberScoresTable.missedNotes} + ${scoreSaberScoresTable.badCuts}`;
          case "maxcombo":
            return scoreSaberScoresTable.maxCombo;
          case "date":
            return scoreSaberScoresTable.timestamp;
          default: {
            const _exhaustive: never = sort as never;
            return _exhaustive;
          }
        }
      },

      async fetchRows(conditions, orderBy, limit, offset) {
        return ScoreSaberScoresRepository.findRowsByConditions(conditions, orderBy, limit, offset);
      },

      getLeaderboardId: row => row.leaderboardId,

      async enrichRow(row, leaderboard) {
        const [enrichedScore, beatSaver] = await Promise.all([
          ScoreCoreService.insertScoreData(scoreSaberScoreRowToType(row), leaderboard),
          BeatSaverService.getMap(
            leaderboard.songHash,
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic
          ),
        ]);
        return { score: enrichedScore, leaderboard, beatSaver };
      },
    });
  }

  /**
   * Gets the player's ScoreSaber medal scores from the database.
   */
  public static async getScoreSaberPlayerMedalScores(
    playerId: string,
    page: number,
    sort: ScoreSaberMedalScoreSortField,
    direction: SortDirection,
    query: PlayerScoresQuery
  ) {
    return PlayerScoresService.getPaginatedPlayerScores(playerId, page, sort, direction, query, {
      buildConditions(playerIds, leaderboardIds, hmd) {
        const conditions: SQL[] = [
          inArray(scoreSaberScoresTable.playerId, playerIds),
          gt(scoreSaberScoresTable.medals, 0),
        ];

        if (sort === "acc") {
          conditions.push(isNotNull(scoreSaberScoresTable.accuracy), gte(scoreSaberScoresTable.accuracy, 0));
        }
        if (leaderboardIds && leaderboardIds.length > 0) {
          conditions.push(inArray(scoreSaberScoresTable.leaderboardId, leaderboardIds));
        }
        if (hmd) {
          conditions.push(eq(scoreSaberScoresTable.hmd, hmd));
        }

        return conditions;
      },

      async countRows(conditions) {
        return ScoreSaberScoresRepository.countByConditions(conditions);
      },

      resolveOrderColumn(sort) {
        switch (sort as ScoreSaberMedalScoreSortField) {
          case "medals":
            return scoreSaberScoresTable.medals;
          case "acc":
            return scoreSaberScoresTable.accuracy;
          case "score":
            return scoreSaberScoresTable.score;
          case "misses":
            return sql`${scoreSaberScoresTable.missedNotes} + ${scoreSaberScoresTable.badCuts}`;
          case "maxcombo":
            return scoreSaberScoresTable.maxCombo;
          case "date":
            return scoreSaberScoresTable.timestamp;
          default: {
            const _exhaustive: never = sort as never;
            return _exhaustive;
          }
        }
      },

      async fetchRows(conditions, orderBy, limit, offset) {
        return ScoreSaberScoresRepository.findRowsByConditions(conditions, orderBy, limit, offset);
      },

      getLeaderboardId: row => row.leaderboardId,

      async enrichRow(row, leaderboard) {
        const [rankByScoreId] = await Promise.all([
          ScoreSaberScoresRepository.getMedalTableScoreRanksForScores([
            { scoreId: row.scoreId, leaderboardId: row.leaderboardId },
          ]),
        ]);

        const medalScore: ScoreSaberMedalScore = {
          ...scoreSaberMedalScoreRowToType(row),
          rank: rankByScoreId.get(row.scoreId) ?? 0,
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
      },
    });
  }
}
