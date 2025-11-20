import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player/player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { PlayerService } from "../../service/player/player.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class PlayerScoreSeedQueue extends Queue<QueueItem<string>> {
  constructor() {
    super(QueueId.PlayerScoreRefreshQueue, "lifo");
    if (!isProduction()) {
      return;
    }

    setImmediate(async () => {
      try {
        // If there are already items in the queue, don't add more
        if ((await this.getSize()) !== 0) {
          return;
        }
        const players = await PlayerModel.find({ seededScores: { $in: [null, false] } })
          .select("_id")
          .lean();
        const playerIds = players.map(p => p._id);
        if (playerIds.length === 0) {
          Logger.info("No players to seed scores for");
          return;
        }

        for (const playerId of playerIds) {
          await this.add({ id: playerId, data: playerId });
        }

        Logger.info(`Added ${playerIds.length} players to score refresh queue`);
      } catch (error) {
        Logger.error("Failed to load unseeded players:", error);
      }
    });
  }

  protected async processItem(item: QueueItem<string>): Promise<void> {
    const { id: playerId } = item;

    const playerToken = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayer(playerId);

    if (!playerToken) {
      Logger.warn(`Player "${playerId}" not found on ScoreSaber`);
      return;
    }

    const player = await PlayerService.getPlayer(playerId, playerToken);
    const { totalScores, missingScores, updatedScores, totalPages, timeTaken, partialRefresh } =
      await PlayerService.refreshAllPlayerScores(player, playerToken);

    await sendEmbedToChannel(
      DiscordChannels.PLAYER_SCORE_REFRESH_LOGS,
      new EmbedBuilder()
        .setTitle("Player Score Refresh Complete" + (partialRefresh ? " (Partial Refresh)" : ""))
        .setDescription(`🎯 **${player.name}**'s scores have been refreshed`)
        .addFields([
          {
            name: "📊 Statistics",
            value: [
              `**Total Scores:** ${formatNumberWithCommas(totalScores)}`,
              `**Missing Scores:** ${formatNumberWithCommas(missingScores)}`,
              `**Updated Scores:** ${formatNumberWithCommas(updatedScores)}`,
              `**Pages:** ${formatNumberWithCommas(totalPages)}`,
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
              .setURL(`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${player._id}`),
          ],
        },
      ]
    );
  }
}
