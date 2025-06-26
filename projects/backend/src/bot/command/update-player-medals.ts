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
    await interaction.deferReply();

    try {
      await PlayerService.updatePlayerMedalCounts();

      await interaction.editReply({
        content: `Finished updating players' medal counts.`,
      });
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
