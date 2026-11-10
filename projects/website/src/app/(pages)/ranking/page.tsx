import { prefetchTimestampedData } from "@/common/server-prefetch";
import RankingData from "@/components/ranking/ranking-data";
import {
  buildRankingQuery,
  loadRankingSearchParams,
  type RankingInitialData,
} from "@/components/ranking/ranking-query";
import { env } from "@ssr/common/env";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import type { SearchParams } from "nuqs/server";

export const revalidate = 300;

type Props = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { country: countryQuery } = loadRankingSearchParams(await searchParams);
  const country = countryQuery?.toUpperCase();

  const fullCountry =
    country === undefined ? "Global" : `${countryFilter.find(c => c.key === country)?.friendlyName}`;
  const title = `Ranking / ${fullCountry}`;
  return {
    title: title,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
      title: title,
      description: `View the players from ${fullCountry === "Global" ? "all over the world" : fullCountry}!`,
      images: ["/icon-512x512.png"],
    },
  };
}

export default async function RankingPage({ searchParams }: Props) {
  const { page, country, search, inactive } = loadRankingSearchParams(await searchParams);
  const query = buildRankingQuery(page, country, search, inactive);

  // Render the players on the server so they are part of the HTML crawlers and users first receive
  const prefetched = await prefetchTimestampedData(
    ssrApi.searchPlayersRanking(query.page, {
      country: query.country,
      search: query.search,
      includeInactives: query.includeInactives,
    })
  );
  const initial: RankingInitialData | undefined = prefetched ? { query, ...prefetched } : undefined;

  return (
    <section className="flex w-full flex-col items-center text-sm">
      <RankingData initial={initial} />
    </section>
  );
}
