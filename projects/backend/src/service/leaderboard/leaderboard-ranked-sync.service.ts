import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { chunkArray } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { leaderboardStarChangeCacheKey } from "../../common/cache-keys";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService from "../infra/cache.service";
import { PlayerMedalsService } from "../medals/player-medals.service";
import { PlayerCoreService } from "../player/player-core.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import { RankedBatchService, type RecordedStarChanges } from "../ranked-batch/ranked-batch.service";
import { RealmScoreSyncService } from "../realm/realm-score-sync.service";
import { RealmService } from "../realm/realm.service";
import {
  diffRankedLeaderboards,
  findUnrankedLeaderboards,
  hasLeaderboardStatusChanged,
  type LeaderboardUpdate,
  type RankedLeaderboardDiff,
} from "./ranked-leaderboard-diff";

export type { LeaderboardUpdate } from "./ranked-leaderboard-diff";

export type RankedSyncResult = {
  /** The leaderboards whose ranked/qualified/stars status changed. */
  updates: LeaderboardUpdate[];
  /** The ranked batch the sync's star changes were recorded in, if there were any. */
  rankedBatch?: RecordedStarChanges;
};

const UPSERT_BATCH_SIZE = 250;
const HISTORY_REWEIGHT_CONCURRENCY = 5;

export class LeaderboardRankedSyncService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Ranked Leaderboard Sync");

  /**
   * Refreshes the ranked leaderboards of every realm.
   *
   * @returns the default realm's result.
   */
  public static async refreshRankedLeaderboards() {
    const realmIds = await RealmService.getRealmIds();
    const defaultResult = await LeaderboardRankedSyncService.refreshRealmRankedLeaderboards(DEFAULT_REALM_ID);

    for (const realmId of realmIds.filter(id => id !== DEFAULT_REALM_ID)) {
      try {
        const { updates } = await LeaderboardRankedSyncService.refreshRealmRankedLeaderboards(realmId);
        const rankedIds = updates
          .filter(update => update.newLeaderboard.ranked)
          .map(u => u.newLeaderboard.id);
        await RealmScoreSyncService.syncLeaderboards(rankedIds, realmId);
      } catch (error) {
        LeaderboardRankedSyncService.logger.error(
          `Failed to refresh realm "${realmId}" leaderboards:`,
          error
        );
      }
    }

    return defaultResult;
  }

  private static async refreshRealmRankedLeaderboards(realmId: number) {
    const isDefaultRealm = realmId === DEFAULT_REALM_ID;
    const before = performance.now();

    LeaderboardRankedSyncService.logger.info(`Refreshing ranked leaderboards for realm "${realmId}"...`);
    const { leaderboards, complete } = await ScoreSaberApiService.getAllLeaderboards("ranked", true, realmId);
    LeaderboardRankedSyncService.logger.info(`Found ${leaderboards.length} ranked leaderboards.`);
    if (!complete) {
      LeaderboardRankedSyncService.logger.warn(
        `Realm "${realmId}": ScoreSaber's ranked list could not be fetched completely, some changes will be picked up by the next sync.`
      );
    }

    const storedRows = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(realmId);
    const stored = new Map(storedRows.map(row => [row.id, row]));

    const { unranked, refusal } = findUnrankedLeaderboards(stored, leaderboards, complete);
    if (refusal) {
      LeaderboardRankedSyncService.logger.error(`Realm "${realmId}": ${refusal}`);
    } else if (unranked.length > 0) {
      LeaderboardRankedSyncService.logger.info(`Found ${unranked.length} unranked leaderboards.`);
    }
    const diff = diffRankedLeaderboards(stored, [...leaderboards, ...unranked]);
    LeaderboardRankedSyncService.logger.info(`Found ${diff.updates.length} leaderboards with changes.`);

    const rankedBatch = await RankedBatchService.recordStarChanges(
      realmId,
      diff.starChanges.map(change => ({ ...change, timestamp: new Date() })),
      diff.newlyRanked.map(map => ({ ...map, timestamp: new Date() }))
    );
    await Promise.all(
      diff.starChanges.map(change =>
        CacheService.invalidate(leaderboardStarChangeCacheKey(change.leaderboardId, realmId))
      )
    );

    await LeaderboardRankedSyncService.upsertLeaderboards(diff.leaderboardsToUpsert, realmId);

    if (isDefaultRealm) {
      await LeaderboardRankedSyncService.refreshDefaultRealmState(diff, [...leaderboards, ...unranked]);
    }

    if (diff.reweightedLeaderboardIds.length > 0) {
      const playerIds = await ScoreSaberScoresRepository.selectDistinctPlayerIdsByLeaderboardIds(
        diff.reweightedLeaderboardIds
      );
      await PlayerCoreService.invalidatePlayersCaches(playerIds);
      LeaderboardRankedSyncService.logger.info(
        `Invalidated ${playerIds.length} cached players after ${diff.reweightedLeaderboardIds.length} reweighted leaderboards.`
      );
    }

    LeaderboardRankedSyncService.sendSyncEmbed(
      "Ranked",
      realmId,
      diff.leaderboardsToUpsert.length,
      leaderboards.length,
      performance.now() - before
    );

    if (isDefaultRealm) {
      await PlayerMedalsService.refreshLeaderboardsMedals(
        diff.updates.map(update => update.newLeaderboard).filter(leaderboard => leaderboard.ranked)
      );
    }

    return { updates: diff.updates, rankedBatch };
  }

  private static async refreshDefaultRealmState(
    diff: RankedLeaderboardDiff,
    apiLeaderboards: ScoreSaberLeaderboard[]
  ) {
    await Promise.all(
      diff.newlyRankedLeaderboardIds.map(leaderboardId =>
        ScoreSaberLeaderboardsRepository.updateLeaderboard(leaderboardId, { seededScores: false })
      )
    );

    const starChangedIds = new Set(diff.starChanges.map(change => change.leaderboardId));
    const reweighted = apiLeaderboards.filter(leaderboard => starChangedIds.has(leaderboard.id));
    for (const batch of chunkArray(reweighted, HISTORY_REWEIGHT_CONCURRENCY)) {
      await Promise.all(
        batch.map(leaderboard => PlayerScoreHistoryService.reweightHistoryScoresForLeaderboard(leaderboard))
      );
    }

    try {
      await RankedBatchService.processPendingPpChanges();
    } catch (error) {
      LeaderboardRankedSyncService.logger.error("Failed to capture ranked batch pp changes:", error);
    }
  }

  private static async upsertLeaderboards(leaderboards: ScoreSaberLeaderboard[], realmId: number) {
    if (leaderboards.length === 0) {
      return;
    }

    LeaderboardRankedSyncService.logger.info(`Updating ${leaderboards.length} leaderboards...`);
    for (const batch of chunkArray(leaderboards, UPSERT_BATCH_SIZE)) {
      await ScoreSaberLeaderboardsRepository.upsertLeaderboards(batch, realmId);
      LeaderboardRankedSyncService.logger.info(`Updated batch of ${batch.length} leaderboards!`);
    }
  }

  /**
   * Refreshes the qualified leaderboards of every realm.
   */
  public static async refreshQualifiedLeaderboards() {
    for (const realmId of await RealmService.getRealmIds()) {
      try {
        await LeaderboardRankedSyncService.refreshRealmQualifiedLeaderboards(realmId);
      } catch (error) {
        LeaderboardRankedSyncService.logger.error(
          `Failed to refresh realm "${realmId}" qualified leaderboards:`,
          error
        );
      }
    }
  }

  private static async refreshRealmQualifiedLeaderboards(realmId: number) {
    const before = performance.now();

    LeaderboardRankedSyncService.logger.info(`Refreshing qualified leaderboards for realm "${realmId}"...`);
    const { leaderboards } = await ScoreSaberApiService.getAllLeaderboards("qualified", true, realmId);
    LeaderboardRankedSyncService.logger.info(`Found ${leaderboards.length} qualified leaderboards.`);

    const storedRows = await ScoreSaberLeaderboardsRepository.getQualifiedLeaderboards(realmId);
    const stored = new Map(storedRows.map(row => [row.id, row]));
    const leaderboardsToUpsert = leaderboards.filter(api =>
      hasLeaderboardStatusChanged(stored.get(api.id), api)
    );

    await LeaderboardRankedSyncService.upsertLeaderboards(leaderboardsToUpsert, realmId);
    LeaderboardRankedSyncService.sendSyncEmbed(
      "Qualified",
      realmId,
      leaderboardsToUpsert.length,
      leaderboards.length,
      performance.now() - before
    );
  }

  private static sendSyncEmbed(
    kind: "Ranked" | "Qualified",
    realmId: number,
    updated: number,
    total: number,
    durationMs: number
  ) {
    const description = `Updated ${updated}/${total} leaderboards in ${formatDuration(durationMs)}`;
    LeaderboardRankedSyncService.logger.info(description);

    sendEmbedToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle(`${kind} Leaderboards Updated (realm ${realmId})`)
        .setDescription(description)
        .setColor("#00ff00")
    );
  }
}
