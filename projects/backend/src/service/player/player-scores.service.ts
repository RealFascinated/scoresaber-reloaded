import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { Pagination, type Page } from "@ssr/common/pagination";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { AccSaberScoreSort, AccSaberScoreType } from "@ssr/common/schemas/accsaber/query/query";
import { ScoreResponse } from "@ssr/common/schemas/accsaber/score/score";
import type { HMD } from "@ssr/common/schemas/hmd";
import { PlayerScoresChartResponse } from "@ssr/common/schemas/response/player/scores-chart";
import type { AccSaberScoresPageResponse } from "@ssr/common/schemas/response/score/accsaber-scores-page";
import { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { PlayerScoresQuery } from "@ssr/common/schemas/score/query/player-scores-query";
import { ScoreSaberMedalScoreSortField } from "@ssr/common/schemas/score/query/sort/scoresaber-medal-scores-sort";
import type { ScoreSaberScoreSortField } from "@ssr/common/schemas/score/query/sort/scoresaber-scores-sort";
import type { SortDirection } from "@ssr/common/schemas/score/query/sort/sort-direction";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ScoreSaberPlayerScoreToken } from "@ssr/common/schemas/scoresaber/tokens/v1/player-score";
import { ScoreSaberPlayerScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v1/player-scores-page";
import type { ScoreSaberPlayerLookupToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { accSaberDifficultyToMapDifficulty } from "@ssr/common/utils/accsaber-difficulty";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { chunkArray } from "@ssr/common/utils/utils";
import { SQL, asc, desc, eq, gt, gte, inArray, isNotNull, sql, type AnyColumn } from "drizzle-orm";
import { scoreSaberMedalScoreRowToType } from "../../db/converter/medal-score";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { scoreSaberScoresTable } from "../../db/schema";
import type { PlayerScoreReconcileQueue } from "../../queue/impl/player-score-reconcile-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { scorePpExpr } from "../../repositories/realm-columns";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberMedalsRepository } from "../../repositories/scoresaber-medals.repository";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import BeatLeaderService from "../beatleader/beatleader.service";
import BeatSaverService from "../external/beatsaver.service";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { PlayerMedalsService } from "../medals/player-medals.service";
import { ScoreCoreService, type ScorePlayerInfoRow } from "../score/score-core.service";
import { PlayerCoreService } from "./player-core.service";

/**
 * Describes how to paginate and enrich a specific score table.
 */
type ScoreTableConfig<TRow, TScore, TContext = undefined> = {
  buildConditions: (playerIds: string[], leaderboardIds: number[] | null, hmd?: HMD) => SQL[];
  countRows: (conditions: SQL[], realmId: number) => Promise<number>;
  resolveOrderColumn: (sort: string) => AnyColumn | SQL;
  fetchRows: (
    conditions: SQL[],
    orderBy: SQL,
    limit: number,
    offset: number,
    realmId: number
  ) => Promise<TRow[]>;
  getLeaderboardId: (row: TRow) => number;
  prepareContext?: (rows: TRow[]) => Promise<TContext>;
  /** When set, the page's player info is loaded with one query and handed to `enrichRow`. */
  getPlayerId?: (row: TRow) => string;
  enrichRow: (
    row: TRow,
    leaderboard: ScoreSaberLeaderboard,
    context: TContext,
    playerInfoById?: ReadonlyMap<string, ScorePlayerInfoRow>
  ) => Promise<PlayerScore<TScore> | undefined>;
};

export class PlayerScoresService {
  private static readonly logger: ScopedLogger = Logger.withTopic("ScoreSaber Player Scores");
  private static readonly COUNT_CHECK_COOLDOWN_MS = 60 * 1000;
  private static readonly RECONCILE_COOLDOWN_MS = 15 * 60 * 1000;
  /** Size at which expired cooldown entries are dropped. */
  private static readonly COUNT_CHECK_PRUNE_SIZE = 5_000;
  private static readonly RECONCILE_PAGE_CONCURRENCY = 3;
  /** playerId -> earliest time the next count check may run */
  private static readonly scoreCountChecks = new Map<string, number>();

  /**
   * Fetches missing scores for a player.
   *
   * @param player the player to refresh scores for
   * @param playerToken the player's token
   * @returns the result of the fetch
   */
  public static async fetchMissingPlayerScores(
    account: ScoreSaberAccount,
    playerToken: ScoreSaberPlayerLookupToken
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
    const rankedLeaderboardsToRefresh = new Map<number, ScoreSaberLeaderboard>();
    const [playerScoresCount, playerHistoryCount] = await Promise.all([
      ScoreSaberScoresRepository.countByPlayerId(playerId),
      ScoreSaberScoreHistoryRepository.countByPlayerId(playerId),
    ]);
    // Replays are archived to the score-history table, so the scores-table count
    // alone can never reach the player's total play count; only the sum of the
    // current rows and archived attempts represents every recorded play.
    const recordedPlays = playerScoresCount + playerHistoryCount;

    if (recordedPlays >= playerToken.stats.totalSubmittedPlays) {
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
      const parsedScores = scoresPage.playerScores
        .map(parseScoreToken)
        .filter(
          (parsed): parsed is { score: ScoreSaberScore; leaderboard: ScoreSaberLeaderboard } =>
            parsed.score != null && parsed.leaderboard != null
        );

      // Batched pre-filter: skip plays already recorded (as the current row or
      // as an archived history entry) so already-tracked pages cost a single
      // batched read instead of per-score reads and writes.
      const [existingScores, existingHistory] = await Promise.all([
        ScoreSaberScoresRepository.findExistingScoreIds(parsedScores.map(score => score.score.scoreId)),
        ScoreSaberScoreHistoryRepository.findExistingScoreIds(parsedScores.map(score => score.score.scoreId)),
      ]);

      const missingScores = parsedScores.filter(
        ({ score }) => !existingScores.has(score.scoreId) && !existingHistory.has(score.scoreId)
      );
      const trackingResults = await ScoreCoreService.trackScoreSaberScoresBatch(missingScores);
      missingScores.forEach(({ leaderboard }, index) => {
        if (trackingResults[index].tracked) {
          result.missingScores++;
          if (leaderboard.ranked) {
            rankedLeaderboardsToRefresh.set(leaderboard.id, leaderboard);
          }
        }
      });

      // Count recorded plays across both current rows and archived attempts;
      // the scores-table count alone can never match the API's total.
      const [scoresCount, historyCount] = await Promise.all([
        ScoreSaberScoresRepository.countByPlayerId(playerId),
        ScoreSaberScoreHistoryRepository.countByPlayerId(playerId),
      ]);
      result.totalScores = scoresCount;

      if (scoresCount + historyCount >= scoresPage.metadata.total) {
        return false;
      }

      return currentPage < Math.ceil(scoresPage.metadata.total / scoresPage.metadata.itemsPerPage);
    }

    let currentPage = 1;
    let hasMoreScores = true;
    let pagesFetched = 0;
    // Set when any page fails to load. ScoreSaberApiService collapses every
    // failure (429/timeout/5xx) to undefined, so a missing page must not be
    // treated as end-of-data: the player stays unseeded for the next cycle.
    let fetchFailed = false;
    while (hasMoreScores) {
      const scoresPage = await getScoresPage(currentPage);
      if (!scoresPage) {
        fetchFailed = true;
        PlayerScoresService.logger.warn(
          `Failed to fetch page ${currentPage} of scores for "${playerId}"; leaving the player unseeded so the next cycle retries the backfill`
        );
        break;
      }

      pagesFetched++;
      hasMoreScores = await processPage(currentPage, scoresPage);
      if (!hasMoreScores) {
        break;
      }
      currentPage++;
    }

    await PlayerMedalsService.refreshLeaderboardsMedals([...rankedLeaderboardsToRefresh.values()]);

    result.totalScores = await ScoreSaberScoresRepository.countByPlayerId(playerId);

    if (!fetchFailed && !account.seededScores) {
      await PlayerCoreService.updatePlayer(account.id, { seededScores: true });
    }

    result.timeTaken = performance.now() - startTime;
    result.totalPagesFetched = pagesFetched;
    if (result.missingScores > 0) {
      PlayerScoresService.logger.info(
        `Fetched missing scores for %s, total pages fetched: %s, total scores: %s, missing scores: %s, in %s`,
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
   * Compares the live ScoreSaber total with our stored count and reconciles when they differ.
   * Never throws; meant to be fired without awaiting.
   *
   * Throttled per player so a hot profile costs at most one count query per cooldown window.
   *
   * @param playerId the player's id
   * @param liveTotal the total score count reported by ScoreSaber
   */
  private static async checkScoreCount(playerId: string, liveTotal: number): Promise<void> {
    const now = Date.now();
    const nextCheck = PlayerScoresService.scoreCountChecks.get(playerId);
    if (nextCheck !== undefined && now < nextCheck) {
      return;
    }
    PlayerScoresService.pruneScoreCountChecks(now);
    PlayerScoresService.scoreCountChecks.set(playerId, now + PlayerScoresService.COUNT_CHECK_COOLDOWN_MS);

    try {
      if (!(await PlayerScoresService.canReconcile(playerId))) {
        return;
      }
      if (await PlayerScoresService.queueReconcileIfCountMismatch(playerId, liveTotal)) {
        PlayerScoresService.scoreCountChecks.set(playerId, now + PlayerScoresService.RECONCILE_COOLDOWN_MS);
      }
    } catch (error) {
      PlayerScoresService.logger.warn(`Failed to check score count for "${playerId}":`, error);
    }
  }

  /**
   * Fetches a single scores page from ScoreSaber to read the player's total score count, and
   * queues a reconcile only when it differs from our stored count. Costs one API call and one
   * count query, so it is cheap to run before queueing a full reconcile.
   *
   * @param playerId the player's id
   * @returns whether a reconcile was queued
   */
  public static async checkScoreCountFromApi(playerId: string): Promise<boolean> {
    if (!(await PlayerScoresService.canReconcile(playerId))) {
      return false;
    }

    const page = await ScoreSaberApiService.lookupPlayerScores({
      playerId,
      page: 1,
      limit: 1,
      sort: "recent",
    });
    if (!page) {
      return false;
    }
    return PlayerScoresService.queueReconcileIfCountMismatch(playerId, page.metadata.total);
  }

  /**
   * Whether a player's scores may be reconciled. Unseeded players are still being backfilled by the
   * refresh queue (which would overlap with a reconcile), and banned players have no scores page.
   */
  private static async canReconcile(playerId: string): Promise<boolean> {
    const account = await PlayerCoreService.getAccount(playerId);
    return account?.seededScores === true && !account.banned;
  }

  /** Drops expired entries so the map can't grow with every player ever viewed. */
  private static pruneScoreCountChecks(now: number): void {
    if (PlayerScoresService.scoreCountChecks.size < PlayerScoresService.COUNT_CHECK_PRUNE_SIZE) {
      return;
    }
    for (const [playerId, nextCheck] of PlayerScoresService.scoreCountChecks) {
      if (now >= nextCheck) {
        PlayerScoresService.scoreCountChecks.delete(playerId);
      }
    }
  }

  private static async queueReconcileIfCountMismatch(playerId: string, liveTotal: number): Promise<boolean> {
    const localTotal = await ScoreSaberScoresRepository.countByPlayerId(playerId);
    if (localTotal === liveTotal) {
      return false;
    }

    PlayerScoresService.logger.info(
      `Score count mismatch for "${playerId}" (ours: ${localTotal}, ScoreSaber: ${liveTotal}), queueing a reconcile...`
    );
    // The queue de-duplicates by player id and runs the reconcile off the request path
    await (QueueManager.getQueue(QueueId.PlayerScoreReconcileQueue) as PlayerScoreReconcileQueue).add({
      id: playerId,
      data: playerId,
    });
    return true;
  }

  /**
   * Reconciles our stored scores with ScoreSaber without wiping them: missing scores are added
   * and scores ScoreSaber no longer has are deleted. Scores that match are left untouched.
   *
   * Nothing is deleted unless every page loaded and the ids collected match ScoreSaber's total.
   *
   * @param playerId the player's id
   */
  public static async reconcilePlayerScores(playerId: string): Promise<void> {
    const limit = 100;
    const firstPage = await ScoreSaberApiService.lookupPlayerScores({
      playerId,
      page: 1,
      limit,
      sort: "recent",
    });
    if (!firstPage) {
      return;
    }

    const pages = [firstPage];
    const totalPages = Math.ceil(firstPage.metadata.total / firstPage.metadata.itemsPerPage);
    const remainingPages = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => index + 2);
    for (const batch of chunkArray(remainingPages, PlayerScoresService.RECONCILE_PAGE_CONCURRENCY)) {
      const batchPages = await Promise.all(
        batch.map(page => ScoreSaberApiService.lookupPlayerScores({ playerId, page, limit, sort: "recent" }))
      );
      for (const page of batchPages) {
        if (!page) {
          PlayerScoresService.logger.warn(
            `Aborted score reconcile for "${playerId}": a page failed to load, nothing was changed`
          );
          return;
        }
        pages.push(page);
      }
    }

    const remoteTokens = pages.flatMap(page => page.playerScores);
    const remoteIds = new Set(remoteTokens.map(token => token.score.id));
    const localIds = await ScoreSaberScoresRepository.findScoreIdsByPlayerId(playerId);

    // Add what we're missing. Tracking also archives a replaced play into the history table.
    const missingEntries = remoteTokens
      .filter(token => !localIds.has(token.score.id))
      .map(token => {
        const leaderboard = getScoreSaberLeaderboardFromToken(token.leaderboard);
        const score =
          leaderboard !== undefined
            ? getScoreSaberScoreFromToken(token.score, leaderboard, playerId)
            : undefined;
        return { score, leaderboard };
      })
      .filter(
        (entry): entry is { score: ScoreSaberScore; leaderboard: ScoreSaberLeaderboard } =>
          entry.score != null && entry.leaderboard != null
      );
    const missingRemoteCount = remoteTokens.filter(token => !localIds.has(token.score.id)).length;
    if (missingRemoteCount > missingEntries.length) {
      PlayerScoresService.logger.warn(
        `Score reconcile for "${playerId}": ${missingRemoteCount - missingEntries.length} missing score(s) skipped because their leaderboard or score could not be built`
      );
    }
    if (remoteIds.size !== firstPage.metadata.total) {
      PlayerScoresService.logger.warn(
        `Score reconcile for "${playerId}": ScoreSaber reported ${firstPage.metadata.total} scores but its pages returned ${remoteIds.size} unique ids (${remoteTokens.length} total), so nothing will be deleted`
      );
    }
    const trackingResults = await ScoreCoreService.trackScoreSaberScoresBatch(missingEntries);
    const rankedLeaderboards = new Map<number, ScoreSaberLeaderboard>();
    let added = 0;
    missingEntries.forEach(({ leaderboard }, index) => {
      if (trackingResults[index].tracked) {
        added++;
        if (leaderboard.ranked) {
          rankedLeaderboards.set(leaderboard.id, leaderboard);
        }
      }
    });
    if (added < missingEntries.length) {
      PlayerScoresService.logger.warn(
        `Score reconcile for "${playerId}": ${missingEntries.length - added} of ${missingEntries.length} missing score(s) were not stored (slot already taken or id already exists)`
      );
    }

    // Delete what ScoreSaber no longer has, but only when the remote list is provably complete.
    let deleted = 0;
    if (remoteIds.size === firstPage.metadata.total) {
      const currentIds = await ScoreSaberScoresRepository.findScoreIdsByPlayerId(playerId);
      const staleIds = [...currentIds].filter(id => !remoteIds.has(id));
      // Removing a ranked score changes the medals on its leaderboard, so note them before the rows go
      const staleLeaderboardIds = await ScoreSaberScoresRepository.findLeaderboardIdsByScoreIds(
        playerId,
        staleIds
      );
      for (const batch of chunkArray(staleIds, 1000)) {
        await ScoreSaberScoresRepository.deleteByPlayerAndScoreIds(playerId, batch);
      }
      deleted = staleIds.length;

      if (staleLeaderboardIds.length > 0) {
        const staleLeaderboards = await ScoreSaberLeaderboardsRepository.getLeaderboardsByIds(
          staleLeaderboardIds,
          true,
          DEFAULT_REALM_ID
        );
        for (const leaderboard of staleLeaderboards) {
          if (leaderboard.ranked) {
            rankedLeaderboards.set(leaderboard.id, leaderboard);
          }
        }
      }
    }

    if (rankedLeaderboards.size > 0) {
      await PlayerMedalsService.refreshLeaderboardsMedals([...rankedLeaderboards.values()]);
    }
    if (deleted > 0) {
      // The removed rows carried this player's medals; the leaderboard refresh only syncs players
      // whose remaining rows changed, so sync this player's total explicitly.
      await PlayerMedalsService.syncPlayersMedalTotals([playerId]);
    }
    if (added > 0 || deleted > 0) {
      await PlayerCoreService.invalidatePlayerCaches(playerId);
    }

    PlayerScoresService.logger.info(
      `Reconciled scores for "${playerId}": added ${added}, deleted ${deleted}`
    );
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player's id
   * @param realmId the realm to resolve pp and stars for
   */
  public static async getPlayerScoreChart(
    playerId: string,
    realmId: number
  ): Promise<PlayerScoresChartResponse> {
    const rows = await ScoreSaberScoresRepository.getChartRowsByPlayer(playerId, realmId);

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
   * @param realmId the realm to resolve pp and leaderboard ranking for
   * @returns the score
   */
  public static async getScore(scoreId: number, realmId: number): Promise<PlayerScore<ScoreSaberScore>> {
    const scoreRow = await ScoreSaberScoresRepository.findAnyRowByScoreId(scoreId, realmId);
    if (!scoreRow) {
      throw new NotFoundError("Score not found");
    }

    const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(scoreRow.leaderboardId, realmId);
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

    const parsedPlayerScores = requestedPage.playerScores.map(playerScore => {
      const leaderboard = getScoreSaberLeaderboardFromToken(playerScore.leaderboard);
      const score = getScoreSaberScoreFromToken(playerScore.score, leaderboard, playerId);
      return { score, leaderboard };
    });

    // Fire-and-forget: persist scores from the ScoreSaber API without blocking the response
    void ScoreCoreService.upsertScoresFromApi(parsedPlayerScores.map(({ score }) => score));

    // A search filters the total, so only the unfiltered total is comparable to our count.
    if (!search?.trim()) {
      void PlayerScoresService.checkScoreCount(playerId, requestedPage.metadata.total);
    }

    const pagination = new Pagination<PlayerScore<ScoreSaberScore>>()
      .setItemsPerPage(requestedPage.metadata.itemsPerPage)
      .setTotalItems(requestedPage.metadata.total);

    return await pagination.getPage(pageNumber, async () => {
      const scores = await Promise.all(
        parsedPlayerScores.map(async ({ score, leaderboard }) => {
          const [enrichedScore, beatSaver] = await Promise.all([
            ScoreCoreService.insertScoreData(score, leaderboard, {
              insertPlayerInfo: false,
              insertPreviousScore: true,
              insertBeatLeaderScore: true,
            }),
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
    direction: SortDirection,
    type: AccSaberScoreType
  ): Promise<AccSaberScoresPageResponse> {
    const requested = await ApiServiceRegistry.getInstance()
      .getAccSaberService()
      .getPlayerScores(playerId, pageNumber, { sort, direction, type });

    const items: ScoreResponse[] = await Promise.all(
      requested.items.map(async row => {
        const songHash = row.songHash;
        const difficulty = accSaberDifficultyToMapDifficulty(row.difficulty);
        const characteristic = row.characteristic;
        const songScore = row.scoreNoMods;

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

  private static async getPaginatedPlayerScores<TRow, TScore, TContext = undefined>(
    playerId: string,
    page: number,
    sort: string,
    direction: SortDirection,
    query: PlayerScoresQuery,
    config: ScoreTableConfig<TRow, TScore, TContext>
  ): Promise<Page<PlayerScore<TScore>>> {
    const limit = 8;
    const offset = (page - 1) * limit;
    const uniquePlayerIds = Array.from(new Set([playerId, ...(query.playerIds ?? [])]));

    // Only search leaderboards if a query is given; null means no filter
    let leaderboardIds: number[] | null = null;
    if (query.search?.trim()) {
      const ids = await ScoreSaberLeaderboardsRepository.searchLeaderboardIds(query.search);
      if (ids.length === 0) {
        return Pagination.empty<PlayerScore<TScore>>();
      }
      leaderboardIds = ids;
    }

    const realmId = query.realmId ?? DEFAULT_REALM_ID;
    const conditions = config.buildConditions(uniquePlayerIds, leaderboardIds, query.hmd);
    const total = await config.countRows(conditions, realmId);
    const pagination = new Pagination<PlayerScore<TScore>>().setItemsPerPage(limit).setTotalItems(total);

    return pagination.getPage(page, async () => {
      const sortOrder = direction === "asc" ? asc : desc;
      const rows = await config.fetchRows(
        conditions,
        sortOrder(config.resolveOrderColumn(sort)),
        limit,
        offset,
        realmId
      );
      if (!rows.length) {
        return [];
      }

      const getPlayerId = config.getPlayerId;
      const [leaderboards, playerInfoById] = await Promise.all([
        ScoreSaberLeaderboardsRepository.getLeaderboardsByIds(
          rows.map(config.getLeaderboardId),
          true,
          realmId
        ),
        getPlayerId ? ScoreCoreService.getPlayerInfoByIds(rows.map(getPlayerId)) : undefined,
      ]);
      const leaderboardMap = new Map(leaderboards.map(lb => [lb.id, lb]));
      const context = config.prepareContext ? await config.prepareContext(rows) : (undefined as TContext);

      const scores = await Promise.all(
        rows.map(async row => {
          const leaderboard = leaderboardMap.get(config.getLeaderboardId(row));
          if (!leaderboard) {
            return undefined;
          }
          return config.enrichRow(row, leaderboard, context, playerInfoById);
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
            return scorePpExpr;
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

      async fetchRows(conditions, orderBy, limit, offset, realmId) {
        return ScoreSaberScoresRepository.findRowsByConditions(conditions, orderBy, limit, offset, realmId);
      },

      getLeaderboardId: row => row.leaderboardId,
      getPlayerId: row => row.playerId,

      async enrichRow(row, leaderboard, _context, playerInfoById) {
        void _context;
        const [enrichedScore, beatSaver] = await Promise.all([
          ScoreCoreService.insertScoreData(scoreSaberScoreRowToType(row), leaderboard, { playerInfoById }),
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
    return PlayerScoresService.getPaginatedPlayerScores(
      playerId,
      page,
      sort,
      direction,
      { ...query, realmId: undefined },
      {
        buildConditions(playerIds, leaderboardIds, hmd) {
          const conditions: SQL[] = [
            inArray(scoreSaberScoresTable.playerId, playerIds),
            gt(scoreSaberScoresTable.medals, 0),
          ];

          if (sort === "acc") {
            conditions.push(
              isNotNull(scoreSaberScoresTable.accuracy),
              gte(scoreSaberScoresTable.accuracy, 0)
            );
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

        async fetchRows(conditions, orderBy, limit, offset, realmId) {
          return ScoreSaberScoresRepository.findRowsByConditions(conditions, orderBy, limit, offset, realmId);
        },

        getLeaderboardId: row => row.leaderboardId,
        getPlayerId: row => row.playerId,

        async prepareContext(rows) {
          return ScoreSaberMedalsRepository.getMedalTableScoreRanksForScores(
            rows.map(row => ({
              scoreId: row.scoreId,
              leaderboardId: row.leaderboardId,
            }))
          );
        },

        async enrichRow(row, leaderboard, context, playerInfoById) {
          const medalScore: ScoreSaberMedalScore = {
            ...scoreSaberMedalScoreRowToType(row),
            rank: context.get(row.scoreId) ?? 0,
          };

          const [enrichedScore, beatSaver] = await Promise.all([
            ScoreCoreService.insertScoreData(medalScore, leaderboard, { playerInfoById }),
            BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic
            ),
          ]);
          return { score: enrichedScore, leaderboard, beatSaver };
        },
      }
    );
  }
}
