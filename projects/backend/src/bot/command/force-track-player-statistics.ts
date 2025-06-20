import { IsGuildUser } from "@discordx/utilities";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { PlayerRefreshService } from "../../service/player/player-refresh.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
export class ForceTrackPlayerStatistics {
  @Slash({
    description: "Force track statistics for all players",
    name: "force-track-player-statistics",
  })
  async forceTrackPlayerStatistics(interaction: CommandInteraction) {
    const before = Date.now();
    interaction.reply({
      content: "Updating player statistics...",
    });

    await PlayerRefreshService.updatePlayerStatistics(
      (currentPage, totalPages, successCount, errorCount) => {
        interaction.editReply({
          content: `Updating player statistics... ${currentPage}/${totalPages} (${successCount} success, ${errorCount} errors)`,
        });
      }
    );

    interaction.editReply({
      content: `Player statistics updated in ${formatDuration(Date.now() - before)}`,
    });
  }
}
