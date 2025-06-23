import { IsGuildUser } from "@discordx/utilities";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { PlayerService } from "../../service/player/player.service";
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

    await PlayerService.updatePlayerStatistics(
      (currentPage, totalPages, successCount, errorCount) => {
        // Only update every 5 pages, and the first page (to show the progress)
        if (currentPage % 5 !== 0 && currentPage !== 1) {
          return;
        }

        interaction.editReply({
          content: [
            "Updating player statistics...",
            `Page: ${formatNumberWithCommas(currentPage)}/${formatNumberWithCommas(totalPages)}`,
            `Success: ${formatNumberWithCommas(successCount)}`,
            `Errors: ${formatNumberWithCommas(errorCount)}`,
          ].join("\n"),
        });
      }
    );

    interaction.editReply({
      content: `Player statistics updated in ${formatDuration(Date.now() - before)}`,
    });
  }
}
