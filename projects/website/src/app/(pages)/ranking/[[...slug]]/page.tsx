import RankingData from "@/components/ranking/ranking-data";
import { env } from "@ssr/common/env";
import { countryFilter } from "@ssr/common/utils/country.util";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

type Props = {
  params: Promise<{
    slug: string[];
  }>;
};

type RankingPageData = {
  page: number;
  country: string | undefined;
};

/**
 * Gets the ranking data.
 *
 * @param params the params
 * @returns the ranking data
 */
const getRankingData = async ({ params }: Props): Promise<RankingPageData> => {
  const { slug } = await params;
  const country = (slug && slug.length > 1 && (slug[0] as string).toUpperCase()) || undefined; // The country query
  const page = (slug && parseInt(slug[country != undefined ? 1 : 0])) || 1; // The page number

  return {
    page,
    country,
  };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { country } = await getRankingData(props);

  const fullCountry =
    country === undefined ? "Global" : `${countryFilter.find(c => c.key === country)?.friendlyName}`;
  const title = `Ranking / ${fullCountry}`;
  return {
    title: title,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title: title,
      description: `View the players from ${fullCountry === "Global" ? "all over the world" : fullCountry}!`,
    },
  };
}

export default async function RankingPage(props: Props) {
  const { page, country } = await getRankingData(props);

  return (
    <main className="flex w-full flex-col items-center text-sm">
      <RankingData initialPage={page} initialCountry={country} />
    </main>
  );
}
