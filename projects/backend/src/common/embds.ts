import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatPp } from "@ssr/common/utils/number-utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../bot/bot";

/**
 * Logs that a new player is being tracked
 *
 * @param player the player being tracked
 */
export async function logNewTrackedPlayer(player: ScoreSaberPlayerToken) {
  await logToChannel(
    DiscordChannels.TRACKED_PLAYER_LOGS,
    new EmbedBuilder()
      .setTitle("New Player Tracked")
      .setDescription(`https://ssr.fascinated.cc/player/${player.id}`)
      .addFields([
        {
          name: "Username",
          value: player.name,
          inline: true,
        },
        {
          name: "ID",
          value: player.id,
          inline: true,
        },
        {
          name: "PP",
          value: formatPp(player.pp) + "pp",
          inline: true,
        },
      ])
      .setThumbnail(player.profilePicture)
      .setColor("#00ff00")
  );
}
