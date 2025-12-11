import { IsGuildUser } from "@discordx/utilities";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { PlayerScoresService } from "../../service/player/player-scores.service";
import { OwnerOnly } from "../lib/guards";
import { PlayerModel } from "@ssr/common/model/player/player";
import Logger from "@ssr/common/logger";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { FetchMissingScoresQueue } from "../../queue/impl/fetch-missing-scores-queue";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class FetchMissingPlayerScores {
  @Slash({
    description: "Force fetch missing scores for a player or all players",
    name: "fetch-missing-player-scores",
  })
  async fetchMissingPlayerScores(
    @SlashOption({
      description: "The player's id to refresh the scores for",
      name: "player",
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    playerId: string,
    interaction: CommandInteraction
  ) {
    try {
      if (!playerId) {
        interaction.reply({
          content: "Adding all players to the fetch missing scores queue...",
        });
        const players = await PlayerModel.find({ seededScores: { $in: [null, false] } })
          .select("_id")
          .lean();
        const playerIds = players.map(p => p._id);
        if (playerIds.length === 0) {
          Logger.info("No players to fetch missing scores for");
          interaction.reply({
            content: "No players to fetch missing scores for",
          });
          return;
        }
        for (const playerId of playerIds) {
          (QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue) as FetchMissingScoresQueue).add({
            id: playerId,
            data: playerId,
          });
        }
        interaction.reply({
          content: `Added ${playerIds.length} players to the fetch missing scores queue`,
        });
        return;
      }

      const playerToken = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupPlayer(playerId);
      if (!playerToken) {
        throw new Error("Player not found");
      }

      const player = await PlayerCoreService.getPlayer(playerId, playerToken);
      PlayerScoresService.fetchMissingPlayerScores(player, playerToken);

      interaction.reply({
        content: `Fetching missing scores for ${player.name}...`,
      });
    } catch (error) {
      interaction.reply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
