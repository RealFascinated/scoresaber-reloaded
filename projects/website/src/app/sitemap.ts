import type { MetadataRoute } from "next";
import { Config } from "@ssr/common/config";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { SSRCache } from "@ssr/common/cache";
import { fetchWithCache } from "backend/src/common/cache.util";

const cache = new SSRCache({
  ttl: 1000 * 60 * 60 * 24 * 3, // 3 days
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const links: MetadataRoute.Sitemap[] = [];

  links.push(
    await fetchWithCache(cache, "player-sitemap", async () => {
      const playerLinks: MetadataRoute.Sitemap[] = [];

      for (let page = 1; page <= 25; page++) {
        const playersResponse = await scoresaberService.lookupPlayers(page);

        if (playersResponse !== undefined) {
          const players = playersResponse.players;

          playerLinks.push(
            players.map(player => {
              return {
                url: `${Config.websiteUrl}/player/${player.id}`,
                images: [player.profilePicture],
                changeFrequency: "daily",
                priority: 0.5,
              };
            })
          );
        }
      }

      return playerLinks.flat();
    })
  );

  return links.flat();
}
