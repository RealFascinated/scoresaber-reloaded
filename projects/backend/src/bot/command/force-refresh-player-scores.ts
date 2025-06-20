import { IsGuildUser } from "@discordx/utilities";
import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import ScoreSaberService from "../../service/scoresaber/scoresaber.service";
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
    try {
      const player = await ScoreSaberService.getPlayer(playerId);

      QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue).add(playerId);

      interaction.reply({
        content: `Added ${player.name} to the refresh queue.`,
      });
    } catch (error) {
      interaction.reply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
