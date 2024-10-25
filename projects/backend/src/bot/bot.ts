import { Client, MetadataStorage } from "discordx";
import { ActivityType, EmbedBuilder } from "discord.js";
import { Config } from "@ssr/common/config";

export enum DiscordChannels {
  trackedPlayerLogs = "1295985197262569512",
  numberOneFeed = "1295988063817830430",
  backendLogs = "1296524935237468250",
}

const client = new Client({
  intents: [],
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
});

client.once("ready", () => {
  console.log("Discord bot ready!");
});

export async function initDiscordBot() {
  console.log("Initializing discord bot...");

  client.once("ready", async () => {
    await client.initApplicationCommands();
  });
  await client.login(Config.discordBotToken!);
}

/**
 * Logs the message to a discord channel.
 *
 * @param channelId the channel id to log to
 * @param message the message to log
 */
export async function logToChannel(channelId: DiscordChannels, message: EmbedBuilder) {
  const channel = await client.channels.fetch(channelId);
  if (channel == undefined) {
    throw new Error(`Channel "${channelId}" not found`);
  }
  if (!channel.isSendable()) {
    throw new Error(`Channel "${channelId}" is not sendable`);
  }

  channel.send({ embeds: [message] });
}
