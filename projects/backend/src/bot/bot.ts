import { Client, MetadataStorage } from "discordx";
import { Config } from "@ssr/common/config";
import { ActivityType, EmbedBuilder } from "discord.js";

export enum DiscordChannels {
  trackedPlayerLogs = "1295985197262569512",
  numberOneFeed = "1295988063817830430",
  backendLogs = "1296524935237468250",
}

const DiscordBot = new Client({
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

DiscordBot.once("ready", () => {
  console.log("Discord bot ready!");
});

export function initDiscordBot() {
  console.log("Initializing discord bot...");

  MetadataStorage.instance.build().then(async () => {
    await DiscordBot.login(Config.discordBotToken!).then();
  });
}

/**
 * Logs the message to a discord channel.
 *
 * @param channelId the channel id to log to
 * @param message the message to log
 */
export function logToChannel(channelId: DiscordChannels, message: EmbedBuilder) {
  const channel = DiscordBot.channels.cache.find(c => c.id === channelId);
  if (channel == undefined) {
    throw new Error(`Channel "${channelId}" not found`);
  }
  if (!channel.isSendable()) {
    throw new Error(`Channel "${channelId}" is not sendable`);
  }

  channel.send({ embeds: [message] });
}
