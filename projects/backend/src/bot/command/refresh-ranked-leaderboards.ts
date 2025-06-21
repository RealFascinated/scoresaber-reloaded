import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import LeaderboardService from "../../service/scoresaber/leaderboard.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
export class RefreshRankedLeaderboards {
  @Slash({
    description: "Force refresh ranked leaderboards",
    name: "refresh-ranked-leaderboards",
  })
  async forceRankedLeaderboardsRefresh(interaction: CommandInteraction) {
    await interaction.deferReply();
    try {
      await LeaderboardService.refreshRankedLeaderboards();
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
