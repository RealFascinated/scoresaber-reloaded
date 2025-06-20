import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player";
import { EmbedBuilder } from "discord.js";
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
    const { totalScores, missingScores } = await PlayerRefreshService.refreshAllPlayerScores(
      player,
      playerToken
    );

    logToChannel(
      DiscordChannels.playerScoreRefreshLogs,
      new EmbedBuilder()
        .setDescription(`Refreshed ${player.name}'s scores`)
        .addFields(
          { name: "Total scores", value: totalScores.toString() },
          { name: "Missing scores", value: missingScores.toString() }
        )
    );
  }
}
