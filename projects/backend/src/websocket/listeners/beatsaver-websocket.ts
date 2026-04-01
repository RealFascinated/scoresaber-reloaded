import Logger from "@ssr/common/logger";
import BeatSaverMapToken from "@ssr/common/types/token/beatsaver/map";
import { connectBeatSaverWebsocket } from "@ssr/common/websocket/beatsaver-websocket";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import BeatSaverService from "../../service/beatsaver.service";
import CacheService from "../../service/cache.service";

export class BeatSaverWebsocket {
  constructor() {
    const ingestMap = async (map: BeatSaverMapToken) => {
      const latestVersion = map.versions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const mapHash = latestVersion?.hash;
      if (!mapHash) {
        return;
      }

      await BeatSaverService.saveMap(map);

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
    };

    connectBeatSaverWebsocket({
      onMapUpdate: async map => {
        await ingestMap(map).catch(error => {
          Logger.error(`Failed to ingest BeatSaver map ${map.id}: ${error}`);
        });
      },
    });
  }
}
