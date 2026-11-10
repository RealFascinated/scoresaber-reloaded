import { prefetchTimestampedData } from "@/common/server-prefetch";
import MedalsData from "@/components/medals/medals-data";
import {
  buildMedalsQuery,
  loadMedalsSearchParams,
  type MedalsInitialData,
} from "@/components/medals/medals-query";
import { env } from "@ssr/common/env";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import type { SearchParams } from "nuqs/server";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Medals Ranking",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
    title: "Medals Ranking",
    description: "View the players with the most medals!",
    images: ["/icon-512x512.png"],
  },
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function MedalsPage({ searchParams }: Props) {
  const { page, country } = loadMedalsSearchParams(await searchParams);
  const query = buildMedalsQuery(page, country);

  // Render the players on the server so they are part of the HTML crawlers and users first receive
  const prefetched = await prefetchTimestampedData(ssrApi.getMedalRankedPlayers(query.page, query.country));
  const initial: MedalsInitialData | undefined = prefetched ? { query, ...prefetched } : undefined;

  return (
    <section className="flex w-full flex-col items-center text-sm">
      <MedalsData initial={initial} />
    </section>
  );
}
