import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import {
  ActionRowData,
  ActivityType,
  AttachmentBuilder,
  EmbedBuilder,
  GatewayIntentBits,
  MessageActionRowComponentBuilder,
  MessageFlags,
} from "discord.js";
import { Client } from "discordx";

import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import "./command/fetch-missing-player-scores";
import "./command/force-track-player-statistics";
import "./command/refresh-medal-scores";
import "./command/refresh-ranked-leaderboards";
import "./command/update-player-medals";

export const DiscordChannels = {
  TRACKED_PLAYER_LOGS: env.DISCORD_CHANNEL_TRACKED_PLAYER_LOGS,
  PLAYER_SCORE_REFRESH_LOGS: env.DISCORD_CHANNEL_PLAYER_SCORE_REFRESH_LOGS,
  RANKED_BATCH_LOGS: env.DISCORD_CHANNEL_RANKED_BATCH_LOGS,
  NUMBER_ONE_FEED: env.DISCORD_CHANNEL_NUMBER_ONE_FEED,
  TOP_50_SCORES_FEED: env.DISCORD_CHANNEL_TOP_50_SCORES_FEED,
  SCORE_FLOODGATE_FEED: env.DISCORD_CHANNEL_SCORE_FLOODGATE_FEED,
  MEDAL_SCORES_FEED: env.DISCORD_CHANNEL_MEDAL_SCORES_FEED,
  BACKEND_LOGS: env.DISCORD_CHANNEL_BACKEND_LOGS,
  BEATSAVER_LOGS: env.DISCORD_CHANNEL_BEATSAVER_LOGS,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  silent: true,
});

client.once("clientReady", async () => {
  await client.initApplicationCommands();

  Logger.info("Discord bot ready!");
});

client.on("interactionCreate", interaction => {
  try {
    client.executeInteraction(interaction);
  } catch (error) {
    Logger.error("Error executing interaction:", error);
    if (interaction.isCommand() || interaction.isContextMenuCommand()) {
      interaction.reply({
        content: "An error occurred while processing your request. Please try again later.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

export async function initDiscordBot() {
  if (!env.DISCORD_BOT_TOKEN) {
    Logger.warn("Discord bot token not found, skipping initialization");
    return;
  }

  Logger.info("Initializing discord bot...");
  try {
    await client.login(env.DISCORD_BOT_TOKEN);

    async function updatePresence() {
      client.user?.setPresence({
        status: "online",
        activities: [
          {
            name: `${formatNumberWithCommas(await ScoreSaberScoreModel.estimatedDocumentCount())} Scores!`,
            type: ActivityType.Watching,
            url: "https://ssr.fascinated.cc",
          },
        ],
      });
    }

    updatePresence();
    setInterval(updatePresence, TimeUnit.toMillis(TimeUnit.Minute, 1));
  } catch (error) {
    Logger.error("Failed to login to Discord:", error);
    throw error; // Re-throw to handle it in the application
  }
}

/**
 * Sends an embed to a discord channel.
 *
 * @param channelId the channel id to log to
 * @param embed the embed to log
 */
export async function sendEmbedToChannel(
  channelId: (typeof DiscordChannels)[keyof typeof DiscordChannels],
  embed: EmbedBuilder,
  components: ActionRowData<MessageActionRowComponentBuilder>[] = []
) {
  if (!channelId) {
    return;
  }
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel != undefined && channel.isSendable()) {
      return await channel.send({ embeds: [embed], components });
    }
  } catch (error) {
    Logger.error(`Failed to send message to channel ${channelId}:`, error);
  }
  return undefined;
}

/**
 * Sends a message to a discord channel.
 *
 * @param channelId the channel id to send the message to
 * @param message the message to send
 */
export async function sendMessageToChannel(
  channelId: (typeof DiscordChannels)[keyof typeof DiscordChannels],
  message: string
) {
  if (!channelId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel != undefined && channel.isSendable()) {
      return await channel.send(message);
    }
  } catch (error) {
    Logger.error(`Failed to send message to channel ${channelId}:`, error);
  }
  return undefined;
}

/**
 * Sends a file to a discord channel.
 *
 * @param channelId the channel id to send the file to
 * @param filename the filename of the file
 * @param file the file to send
 */
export async function sendFile(
  channelId: (typeof DiscordChannels)[keyof typeof DiscordChannels],
  filename: string,
  content: string,
  message?: string
) {
  if (!channelId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel != undefined && channel.isSendable()) {
      return await channel.send({
        content: message,
        files: [
          new AttachmentBuilder(Buffer.from(content), {
            name: filename,
          }),
        ],
      });
    }
  } catch (error) {
    Logger.error(`Error sending file to channel ${channelId}:`, error);
  }
}
