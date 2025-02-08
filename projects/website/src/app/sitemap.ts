import { Config } from "@ssr/common/config";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const links: MetadataRoute.Sitemap[] = [];

  for (let page = 1; page <= 25; page++) {
    const playersResponse = await scoresaberService.lookupPlayers(page);

    if (playersResponse !== undefined) {
      const players = playersResponse.players;

      links.push(
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

  return links.flat();
}
