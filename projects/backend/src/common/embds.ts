import { DiscordChannels, logToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";

/**
 * Logs that a new player is being tracked
 *
 * @param player the player being tracked
 */
export async function logNewTrackedPlayer(player: ScoreSaberPlayerToken) {
  await logToChannel(
    DiscordChannels.trackedPlayerLogs,
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
