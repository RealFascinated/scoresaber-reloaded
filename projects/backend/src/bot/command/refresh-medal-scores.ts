import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { MedalScoresService } from "../../service/score/medal-scores.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class RefreshMedalScores {
  @Slash({
    description: "Resets the medal scores cache and recalculates all medal counts (very slow)",
    name: "refresh-medal-scores",
  })
  async refreshMedalScores(interaction: CommandInteraction) {
    await interaction.reply({
      content: "Refreshing medal scores...",
    });

    try {
      await MedalScoresService.rescanMedalScores();
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
