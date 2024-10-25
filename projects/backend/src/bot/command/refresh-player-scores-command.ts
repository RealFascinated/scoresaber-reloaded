import { Discord, Slash } from "discordx";
import { CommandInteraction } from "discord.js";
import { PlayerService } from "../../service/player.service";

@Discord()
export class RefreshPlayerScoresCommand {
  @Slash({
    description: "Refreshes scores for all tracked players",
    name: "refresh-player-scores",
    defaultMemberPermissions: ["Administrator"],
  })
  hello(interaction: CommandInteraction) {
    interaction.reply("Updating player scores...").then(async response => {
      await PlayerService.refreshPlayerScores();
      await response.edit("Done!");
    });
  }
}
