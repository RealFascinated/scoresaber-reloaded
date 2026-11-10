import { prefetchTimestampedData, type TimestampedData } from "@/common/server-prefetch";
import { MapsData } from "@/components/maps/maps-data";
import { buildMapsQuery, loadMapsSearchParams, type MapsInitialData } from "@/components/maps/maps-query";
import { env } from "@ssr/common/env";
import type { RankingQueueLeaderboardsResponse } from "@ssr/common/schemas/response/leaderboard/ranking-queue-leaderboards";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import type { SearchParams } from "nuqs/server";

type MapsPageProps = {
  params: Promise<{
    type: string;
  }>;
  searchParams: Promise<SearchParams>;
};

const mapTypeMetadata: Record<string, { title: string; description: string }> = {
  leaderboards: {
    title: "Maps / Leaderboards",
    description: "Browse ScoreSaber leaderboards with filters for trending, stars, ranked status, and more.",
  },
  "ranking-queue": {
    title: "Maps / Ranking Queue",
    description: "View ScoreSaber ranking queue requests and discover maps currently up for rank or unrank.",
  },
};

export async function generateMetadata({ params }: MapsPageProps): Promise<Metadata> {
  const { type } = await params;
  const metadataForType = mapTypeMetadata[type] ?? {
    title: "Maps",
    description: "View the maps and playlists on ScoreSaber Reloaded.",
  };

  return {
    title: metadataForType.title,
    description: metadataForType.description,
    alternates: {
      canonical: `/maps/${type}`,
    },
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
      title: metadataForType.title,
      description: metadataForType.description,
      url: `${env.NEXT_PUBLIC_WEBSITE_URL ?? ssrConfig.siteUrl}/maps/${type}`,
      images: ["/icon-512x512.png"],
    },
  };
}

export default async function MapsPage({ params, searchParams }: MapsPageProps) {
  const { type } = await params;

  // Render the selected category's data on the server so it is part of the HTML crawlers and users first
  // receive. An unknown type falls back to the leaderboards, like the client does.
  let initialMaps: MapsInitialData | undefined;
  let initialRankingQueue: TimestampedData<RankingQueueLeaderboardsResponse> | undefined;
  if (type === "ranking-queue") {
    initialRankingQueue = await prefetchTimestampedData(ssrApi.fetchRankingQueue());
  } else {
    const { page, ...filter } = loadMapsSearchParams(await searchParams);
    const query = buildMapsQuery(page, filter);
    const prefetched = await prefetchTimestampedData(
      ssrApi.searchLeaderboards(query.page, {
        category: query.category,
        sort: query.sort,
        minStars: query.minStars,
        maxStars: query.maxStars,
        ranked: query.ranked,
        qualified: query.qualified,
        query: query.query,
      })
    );
    initialMaps = prefetched ? { query, ...prefetched } : undefined;
  }

  return (
    <section className="w-full">
      <MapsData type={type} initialMaps={initialMaps} initialRankingQueue={initialRankingQueue} />
    </section>
  );
}
