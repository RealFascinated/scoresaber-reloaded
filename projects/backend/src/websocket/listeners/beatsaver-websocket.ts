import Logger, { type ScopedLogger } from "@ssr/common/logger";
import BeatSaverMapToken from "@ssr/common/types/token/beatsaver/map";
import { connectBeatSaverWebsocket } from "@ssr/common/websocket/beatsaver-websocket";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { beatSaverMapCacheKey } from "../../common/cache-keys";
import BeatSaverService from "../../service/external/beatsaver.service";
import CacheService from "../../service/infra/cache.service";

export class BeatSaverWebsocket {
  private static readonly logger: ScopedLogger = Logger.withTopic("BeatSaver WebSocket");

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

      const cacheKeys = new Set<string>();
      for (const version of map.versions) {
        for (const diff of version.diffs) {
          cacheKeys.add(beatSaverMapCacheKey(version.hash, diff.difficulty, diff.characteristic));
        }
      }
      await Promise.all([...cacheKeys].map(key => CacheService.invalidate(key)));
      BeatSaverWebsocket.logger.info(`BeatSaver map ${mapHash} updated`);

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
          BeatSaverWebsocket.logger.error(`Failed to ingest BeatSaver map ${map.id}: ${error}`);
        });
      },
    });
  }
}
