import { IsGuildUser } from "@discordx/utilities";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { PlayerService } from "../../service/player/player.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
export class ForceRefreshPlayerScores {
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
    interaction.deferReply();

    try {
      const player = await PlayerService.getPlayer(playerId);
      const playerToken = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupPlayer(playerId);
      if (!playerToken) {
        throw new Error("Player not found");
      }

      await PlayerService.refreshAllPlayerScores(player, playerToken);

      interaction.editReply({
        content: `Refreshed ${player.name}'s scores.`,
      });
    } catch (error) {
      interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
