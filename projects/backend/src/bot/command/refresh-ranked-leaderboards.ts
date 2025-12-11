import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { LeaderboardLeaderboardsService } from "../../service/leaderboard/leaderboard-leaderboards.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class RefreshRankedLeaderboards {
  @Slash({
    description: "Force refresh ranked leaderboards",
    name: "refresh-ranked-leaderboards",
  })
  async forceRankedLeaderboardsRefresh(interaction: CommandInteraction) {
    await interaction.deferReply();
    try {
      await LeaderboardLeaderboardsService.refreshRankedLeaderboards();
      await interaction.editReply({
        content: "Ranked leaderboards refreshed",
      });
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
