import { env } from "@ssr/common/env";
import request from "@ssr/common/utils/request";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const links: MetadataRoute.Sitemap[] = [];

  const playerIds = await request.get<string[]>(
    `${env.NEXT_PUBLIC_API_URL}/sitemap-data/player-ids?token=${env.SITEMAP_DATA_TOKEN}`
  );

  const leaderboardIds = await request.get<string[]>(
    `${env.NEXT_PUBLIC_API_URL}/sitemap-data/leaderboard-ids?token=${env.SITEMAP_DATA_TOKEN}`
  );

  if (playerIds && playerIds.length > 0) {
    links.push(
      playerIds.map(playerId => ({
        url: `${env.NEXT_PUBLIC_WEBSITE_URL}/player/${playerId}`,
        changeFrequency: "daily",
        priority: 0.5,
      }))
    );
  }

  if (leaderboardIds && leaderboardIds.length > 0) {
    links.push(
      leaderboardIds.map(leaderboardId => ({
        url: `${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboardId}`,
        changeFrequency: "daily",
        priority: 0.5,
      }))
    );
  }

  return links.flat();
}
