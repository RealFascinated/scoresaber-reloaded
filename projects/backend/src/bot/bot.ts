import { dirname } from "@discordx/importer";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { isProduction } from "@ssr/common/utils/utils";
import { ActivityType, AttachmentBuilder, EmbedBuilder } from "discord.js";
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
  intents: ["Guilds", "GuildMessages"],
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
  botGuilds: [client => client.guilds.cache.map(guild => guild.id)],
  silent: false,
});

client.once("ready", () => {
  Logger.info("Discord bot ready!");
});

export async function initDiscordBot() {
  Logger.info("Initializing discord bot...");

  client.once("ready", async () => {
    await client.initApplicationCommands();
  });
  client.on("interactionCreate", interaction => {
    client.executeInteraction(interaction);
  });

  // Import all command files using Bun's glob
  const glob = new Bun.Glob("**/*.{js,ts}");
  const commandFiles = await Array.fromAsync(
    glob.scan({
      cwd: `${dirname(import.meta.url)}/commands`,
      absolute: true,
    })
  );

  for (const file of commandFiles) {
    await import(file);
  }

  // Login
  await client.login(env.DISCORD_BOT_TOKEN);
}

/**
 * Logs the message to a discord channel.
 *
 * @param channelId the channel id to log to
 * @param embed the embed to log
 */
export async function logToChannel(channelId: DiscordChannels, embed: EmbedBuilder) {
  if (!isProduction()) {
    return;
  }
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel != undefined && channel.isSendable()) {
      return await channel.send({ embeds: [embed] });
    }
  } catch {
    /* empty */
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
    Logger.error(`Error sending file to channel ${channelId}: ${error}`);
  }
}
