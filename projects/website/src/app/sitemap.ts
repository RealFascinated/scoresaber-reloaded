import { env } from "@ssr/common/env";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { MetadataRoute } from "next";

const WEBSITE_URL = env.NEXT_PUBLIC_WEBSITE_URL;
const SITEMAP_PAGE_LIMIT = 15;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${WEBSITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${WEBSITE_URL}/ranking`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${WEBSITE_URL}/maps/leaderboards`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${WEBSITE_URL}/maps/ranking-queue`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
  ];

  const rankingPageRequests = Array.from({ length: SITEMAP_PAGE_LIMIT }, (_, index) =>
    ssrApi.searchPlayersRanking(index + 1).catch(() => undefined)
  );
  const trendingPageRequests = Array.from({ length: SITEMAP_PAGE_LIMIT }, (_, index) =>
    ssrApi.searchLeaderboards(index + 1, { category: "trending" }).catch(() => undefined)
  );

  const [rankingPageResponses, trendingPageResponses] = await Promise.all([
    Promise.all(rankingPageRequests),
    Promise.all(trendingPageRequests),
  ]);

  const rankingPlayers = rankingPageResponses.flatMap(response => {
    if (!response) {
      return [];
    }
    return response.items;
  });
  const trendingLeaderboards = trendingPageResponses.flatMap(response => {
    if (!response) {
      return [];
    }
    return response.items;
  });

  const uniquePlayerIds = Array.from(new Set(rankingPlayers.map(player => player.id)));
  const uniqueLeaderboardIds = Array.from(new Set(trendingLeaderboards.map(leaderboard => leaderboard.id)));

  const playerRoutes: MetadataRoute.Sitemap = uniquePlayerIds.map(playerId => ({
    url: `${WEBSITE_URL}/player/${playerId}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const leaderboardRoutes: MetadataRoute.Sitemap = uniqueLeaderboardIds.map(leaderboardId => ({
    url: `${WEBSITE_URL}/leaderboard/${leaderboardId}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...playerRoutes, ...leaderboardRoutes];
}
