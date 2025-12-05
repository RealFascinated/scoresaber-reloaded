import Logger from "@ssr/common/logger";
import { BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";
import { connectBeatSaverWebsocket } from "@ssr/common/websocket/beatsaver-websocket";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../bot/bot";
import CacheService from "../service/cache.service";

export class BeatSaverWebsocket {
  constructor() {
    connectBeatSaverWebsocket({
      onMapUpdate: async map => {
        const latestVersion = map.versions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        const mapHash = latestVersion.hash;
        await BeatSaverMapModel.updateOne(
          {
            _id: map.id,
          },
          {
            $set: {
              ...map,
              _id: map.id,
            },
          },
          {
            upsert: true,
          }
        );

        await CacheService.invalidate(`beatsaver:${mapHash}`); // Invalidate the cache for the map
        Logger.info(`BeatSaver map ${mapHash} updated`);

        await sendEmbedToChannel(
          DiscordChannels.BEATSAVER_LOGS,
          new EmbedBuilder()
            .setTitle("BeatSaver Map")
            .setDescription(`Updated map ${map.id} - ${map.name}`)
            .setColor("#00ff00")
            .setThumbnail(latestVersion.coverURL),
          [
            {
              type: 1,
              components: [
                new ButtonBuilder()
                  .setLabel("Map")
                  .setEmoji("🗺️")
                  .setStyle(ButtonStyle.Link)
                  .setURL(`https://beatsaver.com/maps/${map.id}`),
              ],
            },
          ]
        );
      },
    });
  }
}
