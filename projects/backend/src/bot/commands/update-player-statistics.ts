import { CommandInteraction } from "discord.js";
import { Discord, Guild, Slash } from "discordx";
import { PlayerService } from "../../service/player.service";

@Discord()
export class UpdatePlayerStatistics {
  @Guild("1295984874942894100")
  @Slash({ description: "Update player statistics", name: "update-player-statistics" })
  async updatePlayerStatistics(interaction: CommandInteraction) {
    await interaction.deferReply();
    await PlayerService.updatePlayerStatistics(async (currentPage, totalPages) => {
      await interaction.editReply(
        `Updating player statistics... ${currentPage}/${totalPages} pages completed`
      );
    });
    await interaction.editReply("Player statistics updated");
  }
}
