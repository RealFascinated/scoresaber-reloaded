import { IsGuildUser } from "@discordx/utilities";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { PlayerService } from "../../service/player/player.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
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

    await PlayerService.updatePlayerStatistics();

    interaction.editReply({
      content: `Player statistics updated in ${formatDuration(Date.now() - before)}`,
    });
  }
}
