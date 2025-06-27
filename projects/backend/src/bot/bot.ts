import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import {
  ActionRowData,
  ActivityType,
  APIActionRowComponent,
  APIMessageActionRowComponent,
  AttachmentBuilder,
  EmbedBuilder,
  GatewayIntentBits,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { Client } from "discordx";

import "./command/force-refresh-player-scores";
import "./command/force-track-player-statistics";
import "./command/refresh-ranked-leaderboards";
import "./command/update-player-medals";

export const DiscordChannels = {
  TRACKED_PLAYER_LOGS: env.DISCORD_CHANNEL_TRACKED_PLAYER_LOGS,
  PLAYER_SCORE_REFRESH_LOGS: env.DISCORD_CHANNEL_PLAYER_SCORE_REFRESH_LOGS,
  RANKED_BATCH_LOGS: env.DISCORD_CHANNEL_RANKED_BATCH_LOGS,
  NUMBER_ONE_FEED: env.DISCORD_CHANNEL_NUMBER_ONE_FEED,
  TOP_50_SCORES_FEED: env.DISCORD_CHANNEL_TOP_50_SCORES_FEED,
  SCORE_FLOODGATE_FEED: env.DISCORD_CHANNEL_SCORE_FLOODGATE_FEED,
  BACKEND_LOGS: env.DISCORD_CHANNEL_BACKEND_LOGS,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  presence: {
    status: "online",
    activities: [
      {
        name: "scores...",
        type: ActivityType.Watching,
        url: "https://ssr.fascinated.cc",
      },
    ],
  },
  silent: false,
});

client.once("ready", async () => {
  await client.initApplicationCommands();

  Logger.info("Discord bot ready!");
});

// Add error handling for the client
client.on("error", error => {
  Logger.error("Discord client error:", error);
});

client.on("warn", warning => {
  Logger.warn("Discord client warning:", warning);
});

client.on("debug", info => {
  Logger.debug("Discord client debug:", info);
});

client.on("interactionCreate", interaction => {
  client.executeInteraction(interaction);
});

export async function initDiscordBot() {
  if (!env.DISCORD_BOT_TOKEN) {
    Logger.warn("Discord bot token not found, skipping initialization");
    return;
  }

  Logger.info("Initializing discord bot...");
  try {
    await client.login(env.DISCORD_BOT_TOKEN);
  } catch (error) {
    Logger.error("Failed to login to Discord:", error);
    throw error; // Re-throw to handle it in the application
  }
}

/**
 * Logs the message to a discord channel.
 *
 * @param channelId the channel id to log to
 * @param embed the embed to log
 */
export async function logToChannel(
  channelId: (typeof DiscordChannels)[keyof typeof DiscordChannels],
  embed: EmbedBuilder,
  components: (
    | APIActionRowComponent<APIMessageActionRowComponent>
    | ActionRowData<MessageActionRowComponentBuilder>
  )[] = []
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
