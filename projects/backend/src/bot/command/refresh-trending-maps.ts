import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { ScoreEventService } from "../../service/score-event/score-event.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class RefreshTrendingMaps {
  @Slash({
    description: "Force refresh trending map scores",
    name: "refresh-trending-maps",
  })
  async refreshTrendingMaps(interaction: CommandInteraction) {
    await interaction.deferReply();
    try {
      await ScoreEventService.updateTrendingLeaderboards();
      await interaction.editReply({
        content: "Trending map scores refreshed.",
      });
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
