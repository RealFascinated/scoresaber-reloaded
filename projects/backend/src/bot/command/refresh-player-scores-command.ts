import { Discord, Guild, Slash } from "discordx";
import { CommandInteraction } from "discord.js";
import { PlayerService } from "../../service/player.service";
import { guildId } from "../bot";

@Discord()
export class RefreshPlayerScoresCommand {
  @Guild(guildId)
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
