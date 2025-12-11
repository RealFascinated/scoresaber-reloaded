import { IsGuildUser } from "@discordx/utilities";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { PlayerHistoryService } from "../../service/player/player-history.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class ForceTrackPlayerStatistics {
  @Slash({
    description: "Force track statistics for all players",
    name: "force-track-player-statistics",
  })
  async forceTrackPlayerStatistics(interaction: CommandInteraction) {
    const before = Date.now();
    interaction.reply({
      content: "Updating player statistics...",
    });

    await PlayerHistoryService.updatePlayerStatistics();

    interaction.editReply({
      content: `Player statistics updated in ${formatDuration(Date.now() - before)}`,
    });
  }
}
