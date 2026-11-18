import Logger from "@ssr/common/logger";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { Elysia } from "elysia";
import { DiscordChannels, sendEmbedToChannel } from "../bot/bot";
import { cron } from "../common/cron";
import { reportErrorToDiscord } from "../common/discord/error-reporting";
import { ScoreSaberMedalsRepository } from "../repositories/scoresaber-medals.repository";
import { TableCountsRepository } from "../repositories/table-counts.repository";
import { LeaderboardRankedSyncNotificationsService } from "../service/leaderboard/leaderboard-ranked-batch-notifications.service";
import { LeaderboardRankedSyncService } from "../service/leaderboard/leaderboard-ranked-sync.service";
import { PlayerMedalsService } from "../service/medals/player-medals.service";
import { PlayerHistoryService } from "../service/player/player-history.service";
import { ScoreEventService } from "../service/score-event/score-event.service";
import { PlayerPlayedStreakService } from "../service/streaks/player-streaks.service";

const log = Logger.withTopic("SSR Backend");

/** All scheduled background jobs. */
export const crons = new Elysia({ name: "crons" })
  .use(
    cron({
      name: "player-statistics-tracker-cron",
      pattern: "59 23 * * *",
      timezone: "UTC",
      protect: true,
      run: async () => {
        const before = Date.now();
        try {
          await sendEmbedToChannel(
            DiscordChannels.BACKEND_LOGS,
            new EmbedBuilder().setDescription(`Updating player statistics...`)
          );
          await PlayerHistoryService.updatePlayerStatistics();
          await sendEmbedToChannel(
            DiscordChannels.BACKEND_LOGS,
            new EmbedBuilder().setDescription(
              `Updated player statistics in ${formatDuration(Date.now() - before)}`
            )
          );
        } catch (error) {
          log.error("player-statistics-tracker-cron failed:", error);
          reportErrorToDiscord("Cron: player-statistics-tracker", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "refresh-leaderboards-cron",
      pattern: "30 */2 * * *",
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();
          try {
            await LeaderboardRankedSyncNotificationsService.handleRankedBatch(result);
          } catch (error) {
            log.error("refresh-leaderboards-cron ranked batch notification failed:", error);
            reportErrorToDiscord("Cron: refresh-leaderboards (ranked batch notification)", error);
          }
          await LeaderboardRankedSyncService.refreshQualifiedLeaderboards();
        } catch (error) {
          log.error("refresh-leaderboards-cron failed:", error);
          reportErrorToDiscord("Cron: refresh-leaderboards", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "refresh-medal-scores",
      pattern: "*/10 * * * *",
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
        } catch (error) {
          log.error("refresh-medal-scores cron failed:", error);
          reportErrorToDiscord("Cron: refresh-medal-scores", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "nightly-global-medal-refresh",
      pattern: "0 22 * * *",
      timezone: "UTC",
      protect: true,
      run: async () => {
        const before = Date.now();
        try {
          await sendEmbedToChannel(
            DiscordChannels.BACKEND_LOGS,
            new EmbedBuilder()
              .setTitle("Nightly global medal refresh")
              .setDescription("Starting full recompute of score medals and account sync…")
          );
          await PlayerMedalsService.recomputeMedalsFromScoresAndRefreshAccounts();
          await sendEmbedToChannel(
            DiscordChannels.BACKEND_LOGS,
            new EmbedBuilder()
              .setTitle("Nightly global medal refresh")
              .setDescription(`Finished in ${formatDuration(Date.now() - before)}.`)
          );
        } catch (error) {
          log.error("nightly-global-medal-refresh cron failed:", error);
          reportErrorToDiscord("Cron: nightly-global-medal-refresh", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "leaderboard-updates",
      pattern: "0 * * * *",
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          await ScoreEventService.updateTrendingLeaderboards();
          await ScoreEventService.updateLeaderboardDailyPlays();
          await ScoreEventService.purgeOldEvents();
        } catch (error) {
          log.error("leaderboard-updates cron failed:", error);
          reportErrorToDiscord("Cron: leaderboard-updates", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "reconcile-table-counts",
      pattern: "0 3 * * *",
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          await TableCountsRepository.reconcile();
        } catch (error) {
          log.error("reconcile-table-counts cron failed:", error);
          reportErrorToDiscord("Cron: reconcile-table-counts", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "expire-broken-streaks",
      pattern: "0 0 * * *",
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          await PlayerPlayedStreakService.expireBrokenStreaks();
        } catch (error) {
          log.error("expire-broken-streaks cron failed:", error);
          reportErrorToDiscord("Cron: expire-broken-streaks", error);
        }
      },
    })
  );
