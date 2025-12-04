import Logger from "@ssr/common/logger";
import { BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";
import { connectBeatSaverWebsocket } from "@ssr/common/websocket/beatsaver-websocket";
import CacheService from "../service/cache.service";
import { DiscordChannels, sendEmbedToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";

export class BeatSaverWebsocket {
  constructor() {
    connectBeatSaverWebsocket({
      onMapChange: async map => {
        const latestHash = map.versions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0].hash;

        // Update the map in the database if it exists, otherwise create it
        await BeatSaverMapModel.updateOne(
          {
            "versions.hash": latestHash,
          },
          {
            $set: map,
          },
          {
            upsert: true,
          }
        );

        await CacheService.invalidate(`beatsaver:${latestHash}`); // Invalidate the cache for the map

        Logger.info(`BeatSaver map ${latestHash} updated`);
      },

      onMapCreate: async map => {
        sendEmbedToChannel(
          DiscordChannels.BEATSAVER_LOGS,
          new EmbedBuilder().setDescription(`BeatSaver map ${map.id} created`)
        );
      },
      onMapUpdate: async map => {
        sendEmbedToChannel(
          DiscordChannels.BEATSAVER_LOGS,
          new EmbedBuilder().setDescription(`BeatSaver map ${map.id} updated`)
        );
      },
    });
  }
}
