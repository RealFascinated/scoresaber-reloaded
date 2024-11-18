import type { MetadataRoute } from "next";
import { Config } from "@ssr/common/config";
import SuperJSON from "superjson";
import { kyFetchText } from "@ssr/common/utils/utils";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { SSRCache } from "@ssr/common/cache";
import { fetchWithCache } from "backend/src/common/cache.util";

const cache = new SSRCache({
  ttl: 1000 * 60 * 60 * 24 * 3, // 3 days
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const links: MetadataRoute.Sitemap[] = [];

  links.push(
    await fetchWithCache(cache, "leaderboard-sitemap", async () => {
      const leaderboardLinks: MetadataRoute.Sitemap[] = [];

      const leaderboardsResponse = await kyFetchText(`${Config.apiUrl}/leaderboard/ranked`);
      if (leaderboardsResponse !== undefined) {
        const leaderboards = SuperJSON.parse<ScoreSaberLeaderboard[]>(leaderboardsResponse);
        leaderboardLinks.push(
          leaderboards.map(leaderboard => {
            return {
              url: `${Config.websiteUrl}/leaderboard/${leaderboard.id}`,
              images: [`${Config.apiUrl}/image/leaderboard/${leaderboard.id}`],
              changeFrequency: "daily",
              priority: 0.5,
              lastModified: leaderboard.lastRefreshed?.toISOString(),
            };
          })
        );
      }

      return leaderboardLinks.flat();
    })
  );

  links.push(
    await fetchWithCache(cache, "player-sitemap", async () => {
      const playerLinks: MetadataRoute.Sitemap[] = [];

      for (let page = 1; page <= 5; page++) {
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
