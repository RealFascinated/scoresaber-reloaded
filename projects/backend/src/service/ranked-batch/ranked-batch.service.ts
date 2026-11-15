import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { Pagination } from "@ssr/common/pagination";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type {
  PlayerRankedBatch,
  RankedBatch,
  RankedBatchMarker,
} from "@ssr/common/schemas/ranked-batch/ranked-batch";
import type {
  PlayerRankedBatchScoresResponse,
  RankedBatchPlayersPageResponse,
  RankedBatchResponse,
  RankedBatchesPageResponse,
} from "@ssr/common/schemas/ranked-batch/ranked-batch-responses";
import { chunkArray } from "@ssr/common/utils/utils";
import { RANKED_BATCH_MARKERS_CACHE_KEY } from "../../common/cache-keys";
import type { ScoreSaberRankedBatchRow } from "../../db/schema";
import { ScoreSaberLeaderboardStarChangeRepository } from "../../repositories/scoresaber-leaderboard-star-change.repository";
import { ScoreSaberRankedBatchPpRepository } from "../../repositories/scoresaber-ranked-batch-pp.repository";
import { ScoreSaberRankedBatchRepository } from "../../repositories/scoresaber-ranked-batch.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import { PlayerCoreService } from "../player/player-core.service";
import {
  aggregateLeaderboardChanges,
  calculatePlayerPpChange,
  getMergeCutoff,
  getRankedBatchName,
  hasPpChanged,
  type PpChange,
} from "./ranked-batch-calculations";

const RANKED_BATCHES_PER_PAGE = 12;
const RANKED_BATCH_PLAYERS_PER_PAGE = 25;
const LEADERBOARD_CONCURRENCY = 5;
const PLAYER_CHUNK_SIZE = 500;
const UNRANKED_CHUNK_SIZE = 5_000;

/**
 * Groups items by a key, keeping the order of the items within each group.
 */
function groupBy<TItem, TKey>(items: TItem[], getKey: (item: TItem) => TKey): Map<TKey, TItem[]> {
  const groups = new Map<TKey, TItem[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

/** A star change as detected by the ranked sync. */
export type StarChangeInput = {
  leaderboardId: number;
  previousStars: number;
  newStars: number;
  timestamp: Date;
};

/** A leaderboard that became ranked, as detected by the ranked sync. */
export type NewlyRankedInput = {
  leaderboardId: number;
  stars: number;
  timestamp: Date;
};

export type RecordedStarChanges = {
  rankedBatchId: number;
  /** Whether the star changes started a new ranked batch instead of joining an existing one. */
  isNew: boolean;
  /** Whether the ranked batch was already announced, so a merge must not announce it again. */
  alreadyNotified: boolean;
};

export class RankedBatchService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Ranked Batch");

  /**
   * Records the star changes and newly ranked leaderboards of a realm. In the default realm they are
   * attached to a ranked batch: the latest one if it was still collecting changes within the merge
   * window, otherwise a new one. The pp changes of the star changes are captured later by
   * {@link processPendingPpChanges}.
   *
   * @param realmId the realm the changes happened in
   * @param changes the star changes
   * @param newlyRanked the leaderboards that became ranked
   * @returns the ranked batch they were recorded in, or undefined if the realm has no ranked batches
   */
  public static async recordStarChanges(
    realmId: number,
    changes: StarChangeInput[],
    newlyRanked: NewlyRankedInput[] = []
  ): Promise<RecordedStarChanges | undefined> {
    if (changes.length === 0 && newlyRanked.length === 0) {
      return undefined;
    }

    if (realmId !== DEFAULT_REALM_ID) {
      if (changes.length > 0) {
        await ScoreSaberLeaderboardStarChangeRepository.insertRows(
          changes.map(change => ({ ...change, realmId }))
        );
      }
      return undefined;
    }

    const timestamps = [...changes, ...newlyRanked].map(change => change.timestamp.getTime());
    const startedAt = new Date(Math.min(...timestamps));
    const endedAt = new Date(Math.max(...timestamps));

    const existing = await ScoreSaberRankedBatchRepository.findLatestEndedSince(
      realmId,
      getMergeCutoff(startedAt)
    );
    const rankedBatch =
      existing ?? (await ScoreSaberRankedBatchRepository.insert({ realmId, startedAt, endedAt }));
    if (existing) {
      await ScoreSaberRankedBatchRepository.extendEnd(existing.id, endedAt);
    }

    if (changes.length > 0) {
      await ScoreSaberLeaderboardStarChangeRepository.insertRows(
        changes.map(change => ({ ...change, realmId, rankedBatchId: rankedBatch.id, ppPending: true }))
      );
      await ScoreSaberRankedBatchRepository.refreshLeaderboardCount(rankedBatch.id);
    }
    if (newlyRanked.length > 0) {
      await ScoreSaberRankedBatchRepository.insertNewLeaderboards(
        newlyRanked.map(map => ({ ...map, rankedBatchId: rankedBatch.id }))
      );
      await ScoreSaberRankedBatchRepository.refreshNewLeaderboardCount(rankedBatch.id);
    }
    await CacheService.invalidate(RANKED_BATCH_MARKERS_CACHE_KEY);

    RankedBatchService.logger.info(
      `Recorded ${changes.length} star changes and ${newlyRanked.length} newly ranked maps in ranked batch "${rankedBatch.id}" (${existing ? "merged" : "new"}).`
    );
    return {
      rankedBatchId: rankedBatch.id,
      isNew: !existing,
      alreadyNotified: rankedBatch.notifiedAt !== null,
    };
  }

  /**
   * Marks a ranked batch as announced.
   */
  public static async markNotified(rankedBatchId: number): Promise<void> {
    await ScoreSaberRankedBatchRepository.markNotified(rankedBatchId, new Date());
  }

  /**
   * Captures the pp changes of every default realm star change that has not had them captured yet.
   * Leaderboards that fail stay pending and are retried by the next call.
   */
  public static async processPendingPpChanges(): Promise<void> {
    const pending = await ScoreSaberLeaderboardStarChangeRepository.listPpPending(DEFAULT_REALM_ID);
    const byRankedBatch = groupBy(
      pending.filter(row => row.rankedBatchId !== null),
      row => row.rankedBatchId as number
    );

    for (const [rankedBatchId, rows] of byRankedBatch) {
      try {
        const leaderboardIds = [...new Set(rows.map(row => row.leaderboardId))];
        // Rows are oldest first, so the last one of a leaderboard says where it ended up.
        const latestStars = new Map(rows.map(row => [row.leaderboardId, row.newStars]));
        const unrankedIds = new Set(leaderboardIds.filter(id => latestStars.get(id) === 0));
        const captured = await RankedBatchService.captureLeaderboards(
          rankedBatchId,
          leaderboardIds,
          unrankedIds
        );
        const capturedSet = new Set(captured);

        await ScoreSaberLeaderboardStarChangeRepository.markPpCaptured(
          rows.filter(row => capturedSet.has(row.leaderboardId)).map(row => row.id)
        );
        const playerIds = await RankedBatchService.updatePlayerChanges(rankedBatchId, captured);
        await ScoreSaberRankedBatchRepository.refreshPpCounts(rankedBatchId);
        await PlayerCoreService.invalidatePlayersCaches(playerIds);

        RankedBatchService.logger.info(
          `Captured pp changes of ${captured.length}/${leaderboardIds.length} leaderboards for ${playerIds.length} players in ranked batch "${rankedBatchId}".`
        );
      } catch (error) {
        RankedBatchService.logger.error(
          `Failed to capture pp changes for ranked batch "${rankedBatchId}":`,
          error
        );
      }
    }
  }

  /**
   * Captures the pp changes of leaderboards, a few at a time.
   *
   * @param unrankedIds the leaderboards that were unranked, whose scores all lost their pp
   * @returns the ids of the leaderboards that were captured completely
   */
  private static async captureLeaderboards(
    rankedBatchId: number,
    leaderboardIds: number[],
    unrankedIds: ReadonlySet<number>
  ): Promise<number[]> {
    const captured: number[] = [];

    for (const batch of chunkArray(leaderboardIds, LEADERBOARD_CONCURRENCY)) {
      const results = await Promise.allSettled(
        batch.map(leaderboardId =>
          unrankedIds.has(leaderboardId)
            ? RankedBatchService.captureUnrankedLeaderboard(rankedBatchId, leaderboardId)
            : RankedBatchService.captureLeaderboard(rankedBatchId, leaderboardId)
        )
      );
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          captured.push(batch[index]);
        } else {
          RankedBatchService.logger.warn(
            `Failed to capture pp changes of leaderboard "${batch[index]}" for ranked batch "${rankedBatchId}":`,
            result.reason
          );
        }
      });
    }

    return captured;
  }

  /**
   * Captures the pp change of an unranked leaderboard: every score that was worth pp loses all of
   * it, so ScoreSaber does not have to be asked.
   */
  private static async captureUnrankedLeaderboard(
    rankedBatchId: number,
    leaderboardId: number
  ): Promise<void> {
    const scores = await ScoreSaberScoresRepository.selectRealmPpByLeaderboardId(
      DEFAULT_REALM_ID,
      leaderboardId
    );

    for (const chunk of chunkArray(scores, UNRANKED_CHUNK_SIZE)) {
      await ScoreSaberRankedBatchPpRepository.upsertScoreChanges(
        chunk.map(score => ({ ...score, rankedBatchId, ppBefore: score.pp, ppAfter: 0 }))
      );
      await ScoreSaberScoresRepository.setRealmPpForExistingScores(
        DEFAULT_REALM_ID,
        chunk.map(score => ({ scoreId: score.scoreId, pp: 0 }))
      );
    }
  }

  /**
   * Captures the pp change of every stored score on a leaderboard. The pp before is what the
   * database has stored and the pp after is what ScoreSaber reports, so nothing is recomputed.
   * Each page records its changes before overwriting the stored pp, so a retry after a failure
   * still finds the original pp in the recorded rows.
   *
   * @throws if ScoreSaber's scores cannot be fetched, as the leaderboard would be captured partially
   */
  private static async captureLeaderboard(rankedBatchId: number, leaderboardId: number): Promise<void> {
    let page = 1;
    let totalPages = 1;

    do {
      const response = await ScoreSaberApiService.lookupLeaderboardRealmScores(
        leaderboardId,
        page,
        DEFAULT_REALM_ID
      );
      if (response === undefined) {
        throw new Error(`Unable to fetch scores of leaderboard "${leaderboardId}" (page ${page})`);
      }
      totalPages = response.metadata.totalPages;

      const ppAfterByScoreId = new Map(response.data.map(score => [score.id, score.pp]));
      const stored = await ScoreSaberRankedBatchPpRepository.selectStoredScorePps(DEFAULT_REALM_ID, [
        ...ppAfterByScoreId.keys(),
      ]);
      const changed = stored
        .map(score => ({
          rankedBatchId,
          scoreId: score.scoreId,
          playerId: score.playerId,
          leaderboardId: score.leaderboardId,
          ppBefore: score.pp,
          ppAfter: ppAfterByScoreId.get(score.scoreId) ?? 0,
        }))
        .filter(hasPpChanged);

      await ScoreSaberRankedBatchPpRepository.upsertScoreChanges(changed);
      await ScoreSaberScoresRepository.setRealmPpForExistingScores(
        DEFAULT_REALM_ID,
        changed.map(score => ({ scoreId: score.scoreId, pp: score.ppAfter }))
      );
      page++;
    } while (page <= totalPages);
  }

  /**
   * Recalculates the total pp change of every player with a changed score on the leaderboards.
   *
   * @returns the ids of the players that were updated
   */
  private static async updatePlayerChanges(
    rankedBatchId: number,
    leaderboardIds: number[]
  ): Promise<string[]> {
    const playerIds = await ScoreSaberRankedBatchPpRepository.selectChangedPlayerIds(
      rankedBatchId,
      leaderboardIds
    );

    for (const chunk of chunkArray(playerIds, PLAYER_CHUNK_SIZE)) {
      const [scoreChanges, unchanged] = await Promise.all([
        ScoreSaberRankedBatchPpRepository.selectScoreChangesForPlayers(rankedBatchId, chunk),
        ScoreSaberRankedBatchPpRepository.selectUnchangedPps(DEFAULT_REALM_ID, rankedBatchId, chunk),
      ]);

      const changesByPlayer = groupBy(scoreChanges, change => change.playerId);
      const unchangedByPlayer = groupBy(unchanged, row => row.playerId);

      await ScoreSaberRankedBatchPpRepository.upsertPlayerChanges(
        chunk.map(playerId => {
          const changes: PpChange[] = changesByPlayer.get(playerId) ?? [];
          const playerChange = calculatePlayerPpChange(
            (unchangedByPlayer.get(playerId) ?? []).map(row => row.pp),
            changes
          );
          return { rankedBatchId, playerId, scoresChanged: changes.length, ...playerChange };
        })
      );
    }

    return playerIds;
  }

  /**
   * Gets a page of ranked batches, newest first.
   */
  public static async getRankedBatches(page: number): Promise<RankedBatchesPageResponse> {
    const total = await ScoreSaberRankedBatchRepository.count(DEFAULT_REALM_ID);
    return new Pagination<RankedBatch>()
      .setItemsPerPage(RANKED_BATCHES_PER_PAGE)
      .setTotalItems(total)
      .getPage(page, async ({ start }) => {
        const rows = await ScoreSaberRankedBatchRepository.listPage(
          DEFAULT_REALM_ID,
          RANKED_BATCHES_PER_PAGE,
          start
        );
        return RankedBatchService.toRankedBatches(rows);
      });
  }

  /**
   * Gets a ranked batch with the leaderboards it re-rated and the ones that became ranked.
   *
   * @throws NotFoundError if the ranked batch does not exist
   */
  public static async getRankedBatch(rankedBatchId: number): Promise<RankedBatchResponse> {
    const row = await RankedBatchService.getRow(rankedBatchId);
    const [starChanges, newLeaderboards] = await Promise.all([
      ScoreSaberRankedBatchRepository.listStarChanges(rankedBatchId),
      ScoreSaberRankedBatchRepository.listNewLeaderboards(rankedBatchId),
    ]);
    const pendingIds = await ScoreSaberRankedBatchRepository.selectPpPendingIds([row.id]);
    return {
      rankedBatch: RankedBatchService.toRankedBatch(row, pendingIds.has(row.id)),
      leaderboards: aggregateLeaderboardChanges(starChanges),
      newLeaderboards: newLeaderboards.map(({ timestamp: _timestamp, ...leaderboard }) => leaderboard),
    };
  }

  /**
   * Gets the ranked batches as chart markers, oldest first.
   */
  public static async getMarkers(): Promise<RankedBatchMarker[]> {
    return CacheService.fetch(
      CacheId.SCORESABER_RANKED_BATCH_MARKERS,
      RANKED_BATCH_MARKERS_CACHE_KEY,
      async () => {
        const rows = await ScoreSaberRankedBatchRepository.listAll(DEFAULT_REALM_ID);
        return rows.map(row => ({
          id: row.id,
          name: getRankedBatchName(row.name, row.startedAt),
          date: row.startedAt,
        }));
      }
    );
  }

  /**
   * Gets a page of the players a ranked batch changed the most.
   *
   * @throws NotFoundError if the ranked batch does not exist
   */
  public static async getRankedBatchPlayers(
    rankedBatchId: number,
    page: number,
    direction: "gain" | "loss"
  ): Promise<RankedBatchPlayersPageResponse> {
    await RankedBatchService.getRow(rankedBatchId);
    const total = await ScoreSaberRankedBatchPpRepository.countPlayers(rankedBatchId, direction);
    return new Pagination<RankedBatchPlayersPageResponse["items"][number]>()
      .setItemsPerPage(RANKED_BATCH_PLAYERS_PER_PAGE)
      .setTotalItems(total)
      .getPage(page, async ({ start }) => {
        const rows = await ScoreSaberRankedBatchPpRepository.listPlayers(
          rankedBatchId,
          direction,
          RANKED_BATCH_PLAYERS_PER_PAGE,
          start
        );
        return rows.map(row => ({
          playerId: row.playerId,
          name: row.name,
          avatar: row.avatar,
          country: row.country ?? "",
          ppBefore: row.ppBefore,
          ppAfter: row.ppAfter,
          ppDelta: row.ppDelta,
          scoresChanged: row.scoresChanged,
        }));
      });
  }

  /**
   * Gets the ranked batches that changed a player's pp, newest first.
   */
  public static async getPlayerRankedBatches(playerId: string): Promise<PlayerRankedBatch[]> {
    const rows = await ScoreSaberRankedBatchPpRepository.listPlayerRankedBatches(playerId);
    const pendingIds = await ScoreSaberRankedBatchRepository.selectPpPendingIds(
      rows.map(({ rankedBatch }) => rankedBatch.id)
    );
    return rows.map(({ rankedBatch, change }) => ({
      rankedBatch: RankedBatchService.toRankedBatch(rankedBatch, pendingIds.has(rankedBatch.id)),
      ppBefore: change.ppBefore,
      ppAfter: change.ppAfter,
      ppDelta: change.ppDelta,
      scoresChanged: change.scoresChanged,
    }));
  }

  /**
   * Gets every score of a player that a ranked batch changed, the biggest pp gain first.
   *
   * @throws NotFoundError if the player has no changed scores for the ranked batch
   */
  public static async getPlayerRankedBatchScores(
    playerId: string,
    rankedBatchId: number
  ): Promise<PlayerRankedBatchScoresResponse> {
    const rows = await ScoreSaberRankedBatchPpRepository.listPlayerScoreChanges(playerId, rankedBatchId);
    if (rows.length === 0) {
      throw new NotFoundError(`No score changes found for "${playerId}" in ranked batch "${rankedBatchId}"`);
    }
    return rows.map(row => ({
      leaderboardId: row.leaderboardId,
      songHash: row.songHash,
      songName: row.songName,
      songSubName: row.songSubName,
      songAuthorName: row.songAuthorName,
      levelAuthorName: row.levelAuthorName,
      difficulty: row.difficulty,
      characteristic: row.characteristic,
      scoreId: row.scoreId,
      ppBefore: row.ppBefore,
      ppAfter: row.ppAfter,
      ppDelta: row.ppAfter - row.ppBefore,
    }));
  }

  private static async getRow(rankedBatchId: number): Promise<ScoreSaberRankedBatchRow> {
    const row = await ScoreSaberRankedBatchRepository.getById(rankedBatchId);
    if (!row) {
      throw new NotFoundError(`Ranked Batch "${rankedBatchId}" not found`);
    }
    return row;
  }

  private static async toRankedBatches(rows: ScoreSaberRankedBatchRow[]): Promise<RankedBatch[]> {
    const pendingIds = await ScoreSaberRankedBatchRepository.selectPpPendingIds(rows.map(row => row.id));
    return rows.map(row => RankedBatchService.toRankedBatch(row, pendingIds.has(row.id)));
  }

  private static toRankedBatch(row: ScoreSaberRankedBatchRow, ppPending: boolean): RankedBatch {
    return {
      id: row.id,
      name: getRankedBatchName(row.name, row.startedAt),
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      leaderboardCount: row.leaderboardCount,
      newLeaderboardCount: row.newLeaderboardCount,
      playerCount: row.playerCount,
      scoreCount: row.scoreCount,
      ppPending,
    };
  }
}
