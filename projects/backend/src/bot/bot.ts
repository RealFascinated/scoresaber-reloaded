import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { isProduction } from "@ssr/common/utils/utils";
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

export const guildId = "1295984874942894100";
export enum DiscordChannels {
  trackedPlayerLogs = "1295985197262569512",
  numberOneFeed = "1295988063817830430",
  top50Feed = "1338558217042788402",
  backendLogs = "1296524935237468250",
  rankedLogs = "1334376582860636220",
  qualifiedLogs = "1334383809440776233",
  scoreFloodGateFeed = "1338895176034418699",
}

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

client.once("ready", () => {
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

export async function initDiscordBot() {
  Logger.info("Initializing discord bot...");

  // Login
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
  channelId: DiscordChannels,
  embed: EmbedBuilder,
  components: (
    | APIActionRowComponent<APIMessageActionRowComponent>
    | ActionRowData<MessageActionRowComponentBuilder>
  )[] = []
) {
  if (!isProduction()) {
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
  channelId: DiscordChannels,
  filename: string,
  content: string,
  message?: string
) {
  if (!isProduction()) {
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
