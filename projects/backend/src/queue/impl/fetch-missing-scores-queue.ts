import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration, TimeUnit } from "@ssr/common/utils/time-utils";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { and, eq } from "drizzle-orm";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { db } from "../../db";
import { scoreSaberAccountsTable } from "../../db/schema";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { PlayerScoresService } from "../../service/player/player-scores.service";
import { ScoreSaberApiService } from "../../service/scoresaber-api.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class FetchMissingScoresQueue extends Queue<QueueItem<string>> {
  constructor() {
    super(QueueId.PlayerScoreRefreshQueue, "lifo");

    setImmediate(() => this.addPlayersToQueue());
    setInterval(() => this.addPlayersToQueue(), TimeUnit.toMillis(TimeUnit.Hour, 1));
  }

  protected async processItem(item: QueueItem<string>): Promise<void> {
    const { id: playerId } = item;

    const playerToken = await ScoreSaberApiService.lookupPlayer(playerId);
    if (!playerToken) {
      Logger.warn(`Player "${playerId}" not found on ScoreSaber`);
      return;
    }

    const account = await PlayerCoreService.getOrCreateAccount(playerId, playerToken);
    const { totalScores, missingScores, totalPagesFetched, timeTaken } =
      await PlayerScoresService.fetchMissingPlayerScores(account, playerToken);
    if (missingScores == 0) {
      return;
    }

    await sendEmbedToChannel(
      DiscordChannels.PLAYER_SCORE_REFRESH_LOGS,
      new EmbedBuilder()
        .setTitle("Player Score Refresh Complete")
        .setDescription(`🎯 **${account.name}**'s scores have been fetched`)
        .addFields([
          {
            name: "📊 Statistics",
            value: [
              `**Total Scores:** ${formatNumberWithCommas(totalScores)}`,
              `**Missing Scores:** ${formatNumberWithCommas(missingScores)}`,
              `**Pages Fetched:** ${formatNumberWithCommas(totalPagesFetched)}`,
              `**Time Taken:** ${formatDuration(timeTaken)}`,
            ].join("\n"),
            inline: false,
          },
        ])
        .setTimestamp()
        .setColor("#00ff00"),
      [
        {
          type: 1,
          components: [
            new ButtonBuilder()
              .setLabel("Player Profile")
              .setEmoji("👤")
              .setStyle(ButtonStyle.Link)
              .setURL(`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${account.id}`),
          ],
        },
      ]
    );
  }

  private async addPlayersToQueue() {
    try {
      // If there are already items in the queue, don't add more
      if ((await this.getSize()) !== 0) {
        return;
      }
      const players = await db
        .select({ id: scoreSaberAccountsTable.id })
        .from(scoreSaberAccountsTable)
        .where(
          and(eq(scoreSaberAccountsTable.seededScores, false), eq(scoreSaberAccountsTable.banned, false))
        );
      const playerIds = players.map(p => p.id);
      if (playerIds.length === 0) {
        Logger.info("No players to seed scores for");
        return;
      }

      for (const playerId of playerIds) {
        await this.add({ id: playerId, data: playerId });
      }

      await this.processQueue(); // Process the queue immediately
      Logger.info(`Added ${playerIds.length} players to score refresh queue`);
    } catch (error) {
      Logger.error("Failed to load unseeded players:", error);
    }
  }
}
