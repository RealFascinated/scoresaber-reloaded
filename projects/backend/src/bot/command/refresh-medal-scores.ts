import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { PlayerMedalsService } from "../../service/medals/player-medals.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class RefreshMedalScores {
  @Slash({
    description: "Recomputes score medals from ranked leaderboards and refreshes account totals/ranks",
    name: "refresh-medal-scores",
  })
  async refreshMedalScores(interaction: CommandInteraction) {
    await interaction.reply({
      content: "Recomputing medals from main scores…",
    });

    try {
      await PlayerMedalsService.recomputeMedalsFromScoresAndRefreshAccounts();
      await interaction.editReply({
        content: "Medal recompute finished.",
      });
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
