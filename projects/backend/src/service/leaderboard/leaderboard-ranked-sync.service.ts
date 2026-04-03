import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { chunkArray } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { qualifiedLeaderboardsCacheKey, rankedLeaderboardsCacheKey } from "../../common/cache-keys";
import { ScoreSaberLeaderboardStarChangeRepository } from "../../repositories/scoresaber-leaderboard-star-change.repository";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import CacheService from "../infra/cache.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import { ScoreSaberMedalScoresService } from "../score/scoresaber-medal-scores.service";
import { ScoreSaberLeaderboardsService } from "./scoresaber-leaderboards.service";

export type LeaderboardUpdate = {
  previousLeaderboard?: Pick<ScoreSaberLeaderboard, "ranked" | "qualified" | "stars">;
  newLeaderboard: ScoreSaberLeaderboard;
};

export class LeaderboardRankedSyncService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Ranked Leaderboard Sync");

  /**
   * Refreshes the ranked leaderboards.
   *
   * @returns leaderboards whose ranked/qualified/stars status changed.
   */
  public static async refreshRankedLeaderboards(): Promise<LeaderboardUpdate[]> {
    const before = performance.now();

    LeaderboardRankedSyncService.logger.info(`Refreshing ranked leaderboards...`);
    const { leaderboards } = await ScoreSaberLeaderboardsService.fetchLeaderboardsFromAPI("ranked", true);
    LeaderboardRankedSyncService.logger.info(`Found ${leaderboards.length} ranked leaderboards.`);

    const dbRankedRows = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards();
    const rankedLeaderboards = new Map(dbRankedRows.map(r => [r.id, r]));

    const leaderboardsToUpsert: ScoreSaberLeaderboard[] = [];
    const updatedLeaderboards: LeaderboardUpdate[] = [];

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
          await PlayerScoreHistoryService.reweightHistoryScoresForLeaderboard(apiLeaderboard);
          await ScoreSaberLeaderboardStarChangeRepository.insertRow({
            leaderboardId: apiLeaderboard.id,
            previousStars: dbLeaderboard.stars ?? 0,
            newStars: apiLeaderboard.stars,
            timestamp: new Date(),
          });
        }

        // Leaderboard has been ranked
        if (!dbLeaderboard?.ranked && apiLeaderboard.ranked) {
          await ScoreSaberMedalScoresService.rescanLeaderboard(apiLeaderboard.id, true);

          // Let the seeded scores queue handle the updating of the scores
          await ScoreSaberLeaderboardsRepository.updateLeaderboardById(apiLeaderboard.id, {
            seededScores: false,
          });
        }
      }
    }

    // There has been ranked leaderboard changes
    if (leaderboardsToUpsert.length > 0) {
      LeaderboardRankedSyncService.logger.info(`Updating ${leaderboardsToUpsert.length} leaderboards...`);

      for (const batch of chunkArray(leaderboardsToUpsert, 250)) {
        await ScoreSaberLeaderboardsRepository.upsertLeaderboards(batch);
        LeaderboardRankedSyncService.logger.info(`Updated batch of ${batch.length} leaderboards!`);
      }

      await CacheService.invalidate(rankedLeaderboardsCacheKey);

      const duration = formatDuration(performance.now() - before);
      LeaderboardRankedSyncService.logger.info(
        `Updated ${leaderboardsToUpsert.length} leaderboards in ${duration}`
      );
      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("Ranked Leaderboards Updated")
          .setDescription(`Updated ${leaderboardsToUpsert.length} leaderboards in ${duration}`)
          .setColor("#00ff00")
      );
    }

    return updatedLeaderboards;
  }

  /**
   * Refreshes the qualified leaderboards.
   */
  public static async refreshQualifiedLeaderboards() {
    const before = performance.now();

    LeaderboardRankedSyncService.logger.info(`Refreshing qualified leaderboards...`);
    const { leaderboards } = await ScoreSaberLeaderboardsService.fetchLeaderboardsFromAPI("qualified", true);
    LeaderboardRankedSyncService.logger.info(`Found ${leaderboards.length} qualified leaderboards.`);

    const dbQualifiedRows = await ScoreSaberLeaderboardsRepository.getQualifiedLeaderboards();
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
      await ScoreSaberLeaderboardsRepository.upsertLeaderboards(leaderboardsToUpsert);
      await CacheService.invalidate(qualifiedLeaderboardsCacheKey);

      const duration = formatDuration(performance.now() - before);
      LeaderboardRankedSyncService.logger.info(
        `Updated ${leaderboardsToUpsert.length} leaderboards in ${duration}`
      );
      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("Qualified Leaderboards Updated")
          .setDescription(`Updated ${leaderboardsToUpsert.length} leaderboards in ${duration}`)
          .setColor("#00ff00")
      );
    }
  }
}
