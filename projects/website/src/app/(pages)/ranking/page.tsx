import RankingData from "@/components/ranking/ranking-data";
import { env } from "@ssr/common/env";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrConfig } from "config";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

type Props = {
  searchParams: Promise<{
    country?: string;
  }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { country: countryQuery } = await searchParams;
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

export default async function RankingPage() {
  return (
    <section className="flex w-full flex-col items-center text-sm">
      <RankingData />
    </section>
  );
}
