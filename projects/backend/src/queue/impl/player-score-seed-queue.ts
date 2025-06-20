import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../../bot/bot";
import { PlayerRefreshService } from "../../service/player/player-refresh.service";
import { PlayerService } from "../../service/player/player.service";
import { Queue } from "../queue";
import { QueueId } from "../queue-manager";

export class PlayerScoreSeedQueue extends Queue<string> {
  constructor() {
    super(QueueId.PlayerScoreRefreshQueue);

    (async () => {
      const players = await PlayerModel.find({ seededScores: null }).select("_id");
      for (const player of players) {
        this.add(player._id);
      }
    })();
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
    const { totalScores, missingScores, totalPages, timeTaken } =
      await PlayerRefreshService.refreshAllPlayerScores(player, playerToken);

    await logToChannel(
      DiscordChannels.playerScoreRefreshLogs,
      new EmbedBuilder()
        .setTitle("Player Score Refresh Complete")
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
          text: `Powered by ${env.NEXT_PUBLIC_WEBSITE_URL}`,
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
              .setURL(`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${player.id}`),
          ],
        },
      ]
    );
  }
}
