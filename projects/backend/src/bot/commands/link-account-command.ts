import { DetailType } from "@ssr/common/detail-type";
import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Guild, Slash, SlashOption } from "discordx";
import { createGenericEmbed } from "../../common/discord/embed";
import { getDiscordUser } from "../../common/discord/user";
import ScoreSaberService from "../../service/scoresaber.service";
import { guildId } from "../bot";

@Discord()
export class LinkAccountCommand {
  @Guild(guildId)
  @Slash({
    description: "Links your ScoreSaber user to your discord account",
    name: "link-account",
  })
  async onCommand(
    @SlashOption({
      description: "Your ScoreSaber ID",
      name: "id",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    scoreSaberId: string,
    interaction: CommandInteraction
  ) {
    interaction.deferReply().then(async () => {
      try {
        const scoreSaberUser = await ScoreSaberService.getPlayer(scoreSaberId, DetailType.BASIC);
        const user = await getDiscordUser(interaction.user.id);

        user.scoreSaberId = scoreSaberId;
        await user.save();

        await interaction.editReply({
          embeds: [
            createGenericEmbed(
              "Success!",
              `Successfully linked ${scoreSaberUser.name} to your discord account.`
            ),
          ],
        });
      } catch {
        await interaction.editReply({
          embeds: [
            createGenericEmbed(
              "Error",
              `Unable to find a user with the id "${scoreSaberId}".`,
              "error"
            ),
          ],
        });
      }
    });
  }
}
