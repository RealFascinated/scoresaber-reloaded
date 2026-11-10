import { prefetchTimestampedData } from "@/common/server-prefetch";
import { TopScoresData } from "@/components/platform/scoresaber/score/top/top-scores-data";
import {
  loadTopScoresSearchParams,
  type TopScoresInitialData,
} from "@/components/platform/scoresaber/score/top/top-scores-query";
import { env } from "@ssr/common/env";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import type { SearchParams } from "nuqs/server";

export const metadata: Metadata = {
  title: "Top Scores",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
    title: "Top Scores",
    description: "View the top scores set by players on ScoreSaber.",
    images: ["/icon-512x512.png"],
  },
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function TopScoresPage({ searchParams }: Props) {
  const { page } = loadTopScoresSearchParams(await searchParams);

  // Render the scores on the server so they are part of the HTML crawlers and users first receive
  const prefetched = await prefetchTimestampedData(ssrApi.fetchTopScores(page));
  const initial: TopScoresInitialData | undefined = prefetched ? { page, ...prefetched } : undefined;

  return (
    <section className="w-full">
      <TopScoresData initial={initial} />
    </section>
  );
}
