import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { ScoreService } from "../../service/score/score.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
export class RefreshMedalScores {
  @Slash({ description: "Refreshes the medal scores", name: "refresh-medal-scores" })
  async refreshMedalScores(interaction: CommandInteraction) {
    await interaction.reply({
      content: "Refreshing medal scores...",
    });

    try {
      await ScoreService.refreshMedalScores();
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
