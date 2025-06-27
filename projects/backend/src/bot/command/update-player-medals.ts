import { IsGuildUser } from "@discordx/utilities";
import { formatDuration } from "@ssr/common/utils/time-utils";
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
      const before = performance.now();
      await PlayerService.updatePlayerMedalCounts(async (currentPage, totalPages) => {
        if (currentPage % 100 === 0) {
          await interaction.editReply({
            content: `Updating players' medal counts... (${currentPage}/${totalPages})`,
          });
        }
      });
      const timeTaken = performance.now() - before;

      await interaction.editReply({
        content: `Finished updating players' medal counts in ${formatDuration(timeTaken)}`,
      });
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
