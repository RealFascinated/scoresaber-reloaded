import { IsGuildUser } from "@discordx/utilities";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { PlayerScoresService } from "../../service/player/player-scores.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
class ForceRefreshPlayerScores {
  @Slash({ description: "Force refresh a player's scores", name: "force-refresh-player-scores" })
  async forceRefreshPlayerScores(
    @SlashOption({
      description: "The player's id to refresh the scores for",
      name: "player",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    playerId: string,
    interaction: CommandInteraction
  ) {
    try {
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
