import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { chunkArray } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { ScoreSaberLeaderboardStarChangeRepository } from "../../repositories/scoresaber-leaderboard-star-change.repository";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import { PlayerMedalsService } from "../medals/player-medals.service";
import { PlayerCoreService } from "../player/player-core.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import { RealmScoreSyncService } from "../realm/realm-score-sync.service";
import { RealmService } from "../realm/realm.service";

export type LeaderboardUpdate = {
  previousLeaderboard?: Pick<ScoreSaberLeaderboard, "ranked" | "qualified" | "stars">;
  newLeaderboard: ScoreSaberLeaderboard;
};

export class LeaderboardRankedSyncService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Ranked Leaderboard Sync");

  /**
   * Refreshes the ranked leaderboards of every realm.
   *
   * @returns the default realm's leaderboards whose ranked/qualified/stars status changed.
   */
  public static async refreshRankedLeaderboards(): Promise<LeaderboardUpdate[]> {
    const realmIds = await RealmService.getRealmIds();
    const defaultUpdates =
      await LeaderboardRankedSyncService.refreshRealmRankedLeaderboards(DEFAULT_REALM_ID);

    for (const realmId of realmIds.filter(id => id !== DEFAULT_REALM_ID)) {
      try {
        const updates = await LeaderboardRankedSyncService.refreshRealmRankedLeaderboards(realmId);
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

    return defaultUpdates;
  }

  /**
   * Refreshes the ranked leaderboards of a single realm.
   *
   * @param realmId the realm to refresh
   * @returns leaderboards whose ranked/qualified/stars status changed in the realm.
   */
  private static async refreshRealmRankedLeaderboards(realmId: number): Promise<LeaderboardUpdate[]> {
    const isDefaultRealm = realmId === DEFAULT_REALM_ID;
    const before = performance.now();

    LeaderboardRankedSyncService.logger.info(`Refreshing ranked leaderboards for realm "${realmId}"...`);
    const { leaderboards } = await ScoreSaberApiService.getAllLeaderboards("ranked", true, realmId);
    LeaderboardRankedSyncService.logger.info(`Found ${leaderboards.length} ranked leaderboards.`);

    const dbRankedRows = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(realmId);
    const rankedLeaderboards = new Map(dbRankedRows.map(r => [r.id, r]));

    const leaderboardsToUpsert: ScoreSaberLeaderboard[] = [];
    const updatedLeaderboards: LeaderboardUpdate[] = [];
    // Leaderboards whose weight changed, so every player's pp on them changed with it
    const reweightedLeaderboardIds: number[] = [];

    let checked = 0;
    for (const apiLeaderboard of leaderboards) {
      checked++;
      if (checked % 1_000 === 0 || checked === 1 || checked === leaderboards.length) {
        LeaderboardRankedSyncService.logger.info(
          `Checked ${checked} of ${leaderboards.length} leaderboards.`
        );
      }

      const dbLeaderboard = rankedLeaderboards.get(apiLeaderboard.id);
      const statusChanged =
        dbLeaderboard?.ranked !== apiLeaderboard.ranked ||
        dbLeaderboard?.qualified !== apiLeaderboard.qualified ||
        dbLeaderboard?.stars !== apiLeaderboard.stars;

      if (!dbLeaderboard || statusChanged) {
        leaderboardsToUpsert.push(apiLeaderboard);
      }

      if (
        dbLeaderboard &&
        (dbLeaderboard.stars !== apiLeaderboard.stars || dbLeaderboard.ranked !== apiLeaderboard.ranked)
      ) {
        reweightedLeaderboardIds.push(apiLeaderboard.id);
      }

      if (statusChanged) {
        updatedLeaderboards.push({
          previousLeaderboard: dbLeaderboard
            ? {
                ranked: dbLeaderboard.ranked,
                qualified: dbLeaderboard.qualified,
                stars: dbLeaderboard.stars ?? 0,
              }
            : undefined,
          newLeaderboard: apiLeaderboard,
        });

        // Stars count has changed
        if (dbLeaderboard && dbLeaderboard.stars !== apiLeaderboard.stars) {
          // History pp is a default realm snapshot, so only that realm reweights it.
          if (isDefaultRealm) {
            await PlayerScoreHistoryService.reweightHistoryScoresForLeaderboard(apiLeaderboard);
          }
          await ScoreSaberLeaderboardStarChangeRepository.insertRow({
            leaderboardId: apiLeaderboard.id,
            realmId,
            previousStars: dbLeaderboard.stars ?? 0,
            newStars: apiLeaderboard.stars,
            timestamp: new Date(),
          });
        }

        if (isDefaultRealm && !dbLeaderboard?.ranked && apiLeaderboard.ranked) {
          await ScoreSaberLeaderboardsRepository.updateLeaderboard(apiLeaderboard.id, {
            seededScores: false,
          });
        }
      }
    }

    LeaderboardRankedSyncService.logger.info(
      `Found ${updatedLeaderboards.length} leaderboards with changes.`
    );

    // There has been ranked leaderboard changes
    if (leaderboardsToUpsert.length > 0) {
      LeaderboardRankedSyncService.logger.info(`Updating ${leaderboardsToUpsert.length} leaderboards...`);

      for (const batch of chunkArray(leaderboardsToUpsert, 250)) {
        await ScoreSaberLeaderboardsRepository.upsertLeaderboards(batch, realmId);
        LeaderboardRankedSyncService.logger.info(`Updated batch of ${batch.length} leaderboards!`);
      }
    }
    // Cached profiles show pp and statistics derived from these leaderboards, so they are stale now
    if (reweightedLeaderboardIds.length > 0) {
      const playerIds =
        await ScoreSaberScoresRepository.selectDistinctPlayerIdsByLeaderboardIds(reweightedLeaderboardIds);
      await PlayerCoreService.invalidatePlayersCaches(playerIds);
      LeaderboardRankedSyncService.logger.info(
        `Invalidated ${playerIds.length} cached players after ${reweightedLeaderboardIds.length} reweighted leaderboards.`
      );
    }

    const duration = formatDuration(performance.now() - before);
    LeaderboardRankedSyncService.logger.info(
      `Updated ${leaderboardsToUpsert.length}/${leaderboards.length} leaderboards in ${duration}`
    );

    sendEmbedToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle(`Ranked Leaderboards Updated (realm ${realmId})`)
        .setDescription(
          `Updated ${leaderboardsToUpsert.length}/${leaderboards.length} leaderboards in ${duration}`
        )
        .setColor("#00ff00")
    );

    // Medals are awarded in the default realm only.
    const medalRefreshSeen = new Set<number>();
    for (const leaderboard of isDefaultRealm ? updatedLeaderboards : []) {
      if (!leaderboard.newLeaderboard.ranked || medalRefreshSeen.has(leaderboard.newLeaderboard.id)) {
        continue;
      }
      medalRefreshSeen.add(leaderboard.newLeaderboard.id);
      await PlayerMedalsService.refreshLeaderboardMedals(leaderboard.newLeaderboard);
    }

    return updatedLeaderboards;
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

  /**
   * Refreshes the qualified leaderboards of a single realm.
   *
   * @param realmId the realm to refresh
   */
  private static async refreshRealmQualifiedLeaderboards(realmId: number) {
    const before = performance.now();

    LeaderboardRankedSyncService.logger.info(`Refreshing qualified leaderboards for realm "${realmId}"...`);
    const { leaderboards } = await ScoreSaberApiService.getAllLeaderboards("qualified", true, realmId);
    LeaderboardRankedSyncService.logger.info(`Found ${leaderboards.length} qualified leaderboards.`);

    const dbQualifiedRows = await ScoreSaberLeaderboardsRepository.getQualifiedLeaderboards(realmId);
    const qualifiedLeaderboards = new Map(dbQualifiedRows.map(r => [r.id, r]));

    const leaderboardsToUpsert = leaderboards.filter(apiLeaderboard => {
      const db = qualifiedLeaderboards.get(apiLeaderboard.id);
      return (
        !db ||
        db.ranked !== apiLeaderboard.ranked ||
        db.qualified !== apiLeaderboard.qualified ||
        db.stars !== apiLeaderboard.stars
      );
    });

    if (leaderboardsToUpsert.length > 0) {
      LeaderboardRankedSyncService.logger.info(`Updating ${leaderboardsToUpsert.length} leaderboards...`);
      await ScoreSaberLeaderboardsRepository.upsertLeaderboards(leaderboardsToUpsert, realmId);
    }
    const duration = formatDuration(performance.now() - before);
    LeaderboardRankedSyncService.logger.info(
      `Updated ${leaderboardsToUpsert.length}/${leaderboards.length} leaderboards in ${duration}`
    );

    sendEmbedToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle(`Qualified Leaderboards Updated (realm ${realmId})`)
        .setDescription(
          `Updated ${leaderboardsToUpsert.length}/${leaderboards.length} leaderboards in ${duration}`
        )
        .setColor("#00ff00")
    );
  }
}
