import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player/player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../../bot/bot";
import { PlayerService } from "../../service/player/player.service";
import { Queue } from "../queue";
import { QueueId } from "../queue-manager";

export class PlayerScoreSeedQueue extends Queue<string> {
  constructor() {
    super(QueueId.PlayerScoreRefreshQueue, true, "lifo");

    // Load players efficiently using addAll
    setImmediate(async () => {
      try {
        const players = await PlayerModel.find({ seededScores: { $in: [null, false] } })
          .select("_id")
          .lean();
        const playerIds = players.map(p => p._id);
        this.addAll(playerIds);

        Logger.debug(`Added ${playerIds.length} players to score refresh queue`);
      } catch (error) {
        Logger.error("Failed to load unseeded players:", error);
      }
    });
  }

  protected async processItem(playerId: string): Promise<void> {
    const playerToken = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayer(playerId);

    if (!playerToken) {
      Logger.warn(`Player "${playerId}" not found on ScoreSaber`);
      return;
    }

    const player = await PlayerService.getPlayer(playerId, playerToken);
    const { totalScores, missingScores, totalPages, timeTaken, partialRefresh } =
      await PlayerService.refreshAllPlayerScores(player, playerToken);

    await logToChannel(
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
              `**Pages:** ${formatNumberWithCommas(totalPages)}`,
              `**Time Taken:** ${formatDuration(timeTaken)}`,
            ].join("\n"),
            inline: false,
          },
        ])
        .setTimestamp()
        .setFooter({
          text: `${this.getSize() - 1 <= 0 ? "No" : this.getSize() - 1} players left in queue`,
        })
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
