import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { PlayerService } from "../../service/player/player.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
export class ForceRefreshPlayerScores {
  @Slash({ description: "Updates every players medal count", name: "update-player-medals" })
  async updatePlayerMedals(interaction: CommandInteraction) {
    await interaction.reply({
      content: "Updating players' medal counts...",
    });

    try {
      await PlayerService.updatePlayerGlobalMedalCounts();
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
