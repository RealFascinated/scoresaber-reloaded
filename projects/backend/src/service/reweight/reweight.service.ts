import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { Pagination } from "@ssr/common/pagination";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { PlayerReweight, Reweight, ReweightMarker } from "@ssr/common/schemas/reweight/reweight";
import type {
  PlayerReweightScoresResponse,
  ReweightPlayersPageResponse,
  ReweightResponse,
  ReweightsPageResponse,
} from "@ssr/common/schemas/reweight/reweight-responses";
import { chunkArray } from "@ssr/common/utils/utils";
import { REWEIGHT_MARKERS_CACHE_KEY } from "../../common/cache-keys";
import type { ScoreSaberReweightRow } from "../../db/schema";
import { ScoreSaberLeaderboardStarChangeRepository } from "../../repositories/scoresaber-leaderboard-star-change.repository";
import { ScoreSaberReweightPpRepository } from "../../repositories/scoresaber-reweight-pp.repository";
import { ScoreSaberReweightRepository } from "../../repositories/scoresaber-reweight.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import { PlayerCoreService } from "../player/player-core.service";
import {
  aggregateLeaderboardChanges,
  calculatePlayerPpChange,
  getMergeCutoff,
  getReweightName,
  hasPpChanged,
  type PpChange,
} from "./reweight-calculations";

const REWEIGHTS_PER_PAGE = 12;
const REWEIGHT_PLAYERS_PER_PAGE = 25;
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

export type RecordedStarChanges = {
  reweightId: number;
  /** Whether the star changes started a new reweight instead of joining an existing one. */
  isNew: boolean;
  /** Whether the reweight was already announced, so a merge must not announce it again. */
  alreadyNotified: boolean;
};

export class ReweightService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Reweight");

  /**
   * Records the star changes of a realm. In the default realm they are attached to a reweight:
   * the latest one if it was still collecting changes within the merge window, otherwise a new
   * one. Their pp changes are captured later by {@link processPendingPpChanges}.
   *
   * @param realmId the realm the star changes happened in
   * @param changes the star changes
   * @returns the reweight they were recorded in, or undefined if the realm has no reweights
   */
  public static async recordStarChanges(
    realmId: number,
    changes: StarChangeInput[]
  ): Promise<RecordedStarChanges | undefined> {
    if (changes.length === 0) {
      return undefined;
    }

    if (realmId !== DEFAULT_REALM_ID) {
      await ScoreSaberLeaderboardStarChangeRepository.insertRows(
        changes.map(change => ({ ...change, realmId }))
      );
      return undefined;
    }

    const timestamps = changes.map(change => change.timestamp.getTime());
    const startedAt = new Date(Math.min(...timestamps));
    const endedAt = new Date(Math.max(...timestamps));

    const existing = await ScoreSaberReweightRepository.findLatestEndedSince(
      realmId,
      getMergeCutoff(startedAt)
    );
    const reweight = existing ?? (await ScoreSaberReweightRepository.insert({ realmId, startedAt, endedAt }));
    if (existing) {
      await ScoreSaberReweightRepository.extendEnd(existing.id, endedAt);
    }

    await ScoreSaberLeaderboardStarChangeRepository.insertRows(
      changes.map(change => ({ ...change, realmId, reweightId: reweight.id, ppPending: true }))
    );
    await ScoreSaberReweightRepository.refreshLeaderboardCount(reweight.id);
    await CacheService.invalidate(REWEIGHT_MARKERS_CACHE_KEY);

    ReweightService.logger.info(
      `Recorded ${changes.length} star changes in reweight "${reweight.id}" (${existing ? "merged" : "new"}).`
    );
    return { reweightId: reweight.id, isNew: !existing, alreadyNotified: reweight.notifiedAt !== null };
  }

  /**
   * Marks a reweight as announced.
   */
  public static async markNotified(reweightId: number): Promise<void> {
    await ScoreSaberReweightRepository.markNotified(reweightId, new Date());
  }

  /**
   * Captures the pp changes of every default realm star change that has not had them captured yet.
   * Leaderboards that fail stay pending and are retried by the next call.
   */
  public static async processPendingPpChanges(): Promise<void> {
    const pending = await ScoreSaberLeaderboardStarChangeRepository.listPpPending(DEFAULT_REALM_ID);
    const byReweight = groupBy(
      pending.filter(row => row.reweightId !== null),
      row => row.reweightId as number
    );

    for (const [reweightId, rows] of byReweight) {
      try {
        const leaderboardIds = [...new Set(rows.map(row => row.leaderboardId))];
        // Rows are oldest first, so the last one of a leaderboard says where it ended up.
        const latestStars = new Map(rows.map(row => [row.leaderboardId, row.newStars]));
        const unrankedIds = new Set(leaderboardIds.filter(id => latestStars.get(id) === 0));
        const captured = await ReweightService.captureLeaderboards(reweightId, leaderboardIds, unrankedIds);
        const capturedSet = new Set(captured);

        await ScoreSaberLeaderboardStarChangeRepository.markPpCaptured(
          rows.filter(row => capturedSet.has(row.leaderboardId)).map(row => row.id)
        );
        const playerIds = await ReweightService.updatePlayerChanges(reweightId, captured);
        await ScoreSaberReweightRepository.refreshPpCounts(reweightId);
        await PlayerCoreService.invalidatePlayersCaches(playerIds);

        ReweightService.logger.info(
          `Captured pp changes of ${captured.length}/${leaderboardIds.length} leaderboards for ${playerIds.length} players in reweight "${reweightId}".`
        );
      } catch (error) {
        ReweightService.logger.error(`Failed to capture pp changes for reweight "${reweightId}":`, error);
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
    reweightId: number,
    leaderboardIds: number[],
    unrankedIds: ReadonlySet<number>
  ): Promise<number[]> {
    const captured: number[] = [];

    for (const batch of chunkArray(leaderboardIds, LEADERBOARD_CONCURRENCY)) {
      const results = await Promise.allSettled(
        batch.map(leaderboardId =>
          unrankedIds.has(leaderboardId)
            ? ReweightService.captureUnrankedLeaderboard(reweightId, leaderboardId)
            : ReweightService.captureLeaderboard(reweightId, leaderboardId)
        )
      );
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          captured.push(batch[index]);
        } else {
          ReweightService.logger.warn(
            `Failed to capture pp changes of leaderboard "${batch[index]}" for reweight "${reweightId}":`,
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
  private static async captureUnrankedLeaderboard(reweightId: number, leaderboardId: number): Promise<void> {
    const scores = await ScoreSaberScoresRepository.selectRealmPpByLeaderboardId(
      DEFAULT_REALM_ID,
      leaderboardId
    );

    for (const chunk of chunkArray(scores, UNRANKED_CHUNK_SIZE)) {
      await ScoreSaberReweightPpRepository.upsertScoreChanges(
        chunk.map(score => ({ ...score, reweightId, ppBefore: score.pp, ppAfter: 0 }))
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
  private static async captureLeaderboard(reweightId: number, leaderboardId: number): Promise<void> {
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
      const stored = await ScoreSaberReweightPpRepository.selectStoredScorePps(DEFAULT_REALM_ID, [
        ...ppAfterByScoreId.keys(),
      ]);
      const changed = stored
        .map(score => ({
          reweightId,
          scoreId: score.scoreId,
          playerId: score.playerId,
          leaderboardId: score.leaderboardId,
          ppBefore: score.pp,
          ppAfter: ppAfterByScoreId.get(score.scoreId) ?? 0,
        }))
        .filter(hasPpChanged);

      await ScoreSaberReweightPpRepository.upsertScoreChanges(changed);
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
  private static async updatePlayerChanges(reweightId: number, leaderboardIds: number[]): Promise<string[]> {
    const playerIds = await ScoreSaberReweightPpRepository.selectChangedPlayerIds(reweightId, leaderboardIds);

    for (const chunk of chunkArray(playerIds, PLAYER_CHUNK_SIZE)) {
      const [scoreChanges, unchanged] = await Promise.all([
        ScoreSaberReweightPpRepository.selectScoreChangesForPlayers(reweightId, chunk),
        ScoreSaberReweightPpRepository.selectUnchangedPps(DEFAULT_REALM_ID, reweightId, chunk),
      ]);

      const changesByPlayer = groupBy(scoreChanges, change => change.playerId);
      const unchangedByPlayer = groupBy(unchanged, row => row.playerId);

      await ScoreSaberReweightPpRepository.upsertPlayerChanges(
        chunk.map(playerId => {
          const changes: PpChange[] = changesByPlayer.get(playerId) ?? [];
          const playerChange = calculatePlayerPpChange(
            (unchangedByPlayer.get(playerId) ?? []).map(row => row.pp),
            changes
          );
          return { reweightId, playerId, scoresChanged: changes.length, ...playerChange };
        })
      );
    }

    return playerIds;
  }

  /**
   * Gets a page of reweights, newest first.
   */
  public static async getReweights(page: number): Promise<ReweightsPageResponse> {
    const total = await ScoreSaberReweightRepository.count(DEFAULT_REALM_ID);
    return new Pagination<Reweight>()
      .setItemsPerPage(REWEIGHTS_PER_PAGE)
      .setTotalItems(total)
      .getPage(page, async ({ start }) => {
        const rows = await ScoreSaberReweightRepository.listPage(DEFAULT_REALM_ID, REWEIGHTS_PER_PAGE, start);
        return ReweightService.toReweights(rows);
      });
  }

  /**
   * Gets a reweight and the leaderboards it re-rated.
   *
   * @throws NotFoundError if the reweight does not exist
   */
  public static async getReweight(reweightId: number): Promise<ReweightResponse> {
    const row = await ReweightService.getRow(reweightId);
    const starChanges = await ScoreSaberReweightRepository.listStarChanges(reweightId);
    const pendingIds = await ScoreSaberReweightRepository.selectPpPendingIds([row.id]);
    return {
      reweight: ReweightService.toReweight(row, pendingIds.has(row.id)),
      leaderboards: aggregateLeaderboardChanges(starChanges),
    };
  }

  /**
   * Gets the reweights as chart markers, oldest first.
   */
  public static async getMarkers(): Promise<ReweightMarker[]> {
    return CacheService.fetch(CacheId.SCORESABER_REWEIGHT_MARKERS, REWEIGHT_MARKERS_CACHE_KEY, async () => {
      const rows = await ScoreSaberReweightRepository.listAll(DEFAULT_REALM_ID);
      return rows.map(row => ({
        id: row.id,
        name: getReweightName(row.name, row.startedAt),
        date: row.startedAt,
      }));
    });
  }

  /**
   * Gets a page of the players a reweight changed the most.
   *
   * @throws NotFoundError if the reweight does not exist
   */
  public static async getReweightPlayers(
    reweightId: number,
    page: number,
    direction: "gain" | "loss"
  ): Promise<ReweightPlayersPageResponse> {
    await ReweightService.getRow(reweightId);
    const total = await ScoreSaberReweightPpRepository.countPlayers(reweightId, direction);
    return new Pagination<ReweightPlayersPageResponse["items"][number]>()
      .setItemsPerPage(REWEIGHT_PLAYERS_PER_PAGE)
      .setTotalItems(total)
      .getPage(page, async ({ start }) => {
        const rows = await ScoreSaberReweightPpRepository.listPlayers(
          reweightId,
          direction,
          REWEIGHT_PLAYERS_PER_PAGE,
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
   * Gets the reweights that changed a player's pp, newest first.
   */
  public static async getPlayerReweights(playerId: string): Promise<PlayerReweight[]> {
    const rows = await ScoreSaberReweightPpRepository.listPlayerReweights(playerId);
    const pendingIds = await ScoreSaberReweightRepository.selectPpPendingIds(
      rows.map(({ reweight }) => reweight.id)
    );
    return rows.map(({ reweight, change }) => ({
      reweight: ReweightService.toReweight(reweight, pendingIds.has(reweight.id)),
      ppBefore: change.ppBefore,
      ppAfter: change.ppAfter,
      ppDelta: change.ppDelta,
      scoresChanged: change.scoresChanged,
    }));
  }

  /**
   * Gets every score of a player that a reweight changed, the biggest pp gain first.
   *
   * @throws NotFoundError if the player has no changed scores for the reweight
   */
  public static async getPlayerReweightScores(
    playerId: string,
    reweightId: number
  ): Promise<PlayerReweightScoresResponse> {
    const rows = await ScoreSaberReweightPpRepository.listPlayerScoreChanges(playerId, reweightId);
    if (rows.length === 0) {
      throw new NotFoundError(`No score changes found for "${playerId}" in reweight "${reweightId}"`);
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

  private static async getRow(reweightId: number): Promise<ScoreSaberReweightRow> {
    const row = await ScoreSaberReweightRepository.getById(reweightId);
    if (!row) {
      throw new NotFoundError(`Reweight "${reweightId}" not found`);
    }
    return row;
  }

  private static async toReweights(rows: ScoreSaberReweightRow[]): Promise<Reweight[]> {
    const pendingIds = await ScoreSaberReweightRepository.selectPpPendingIds(rows.map(row => row.id));
    return rows.map(row => ReweightService.toReweight(row, pendingIds.has(row.id)));
  }

  private static toReweight(row: ScoreSaberReweightRow, ppPending: boolean): Reweight {
    return {
      id: row.id,
      name: getReweightName(row.name, row.startedAt),
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      leaderboardCount: row.leaderboardCount,
      playerCount: row.playerCount,
      scoreCount: row.scoreCount,
      ppPending,
    };
  }
}
