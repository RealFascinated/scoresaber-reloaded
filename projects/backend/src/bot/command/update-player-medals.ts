import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { PlayerMedalsService } from "../../service/player/player-medals.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
class ForceRefreshPlayerScores {
  @Slash({ description: "Updates every players medal count", name: "update-player-medals" })
  async updatePlayerMedals(interaction: CommandInteraction) {
    await interaction.reply({
      content: "Updating players' medal counts...",
    });

    try {
      await PlayerMedalsService.updatePlayerGlobalMedalCounts();
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
