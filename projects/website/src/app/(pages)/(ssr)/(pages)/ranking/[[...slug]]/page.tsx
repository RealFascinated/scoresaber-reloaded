import RankingData from "@/components/ranking/ranking-data";
import { env } from "@ssr/common/env";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreSaberPlayersPageToken } from "@ssr/common/types/token/scoresaber/players-page";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

const UNKNOWN_PAGE = {
  title: "Unknown Page",
  description: "The page you were looking for could not be found",
};

type Props = {
  params: Promise<{
    slug: string[];
  }>;
};

type RankingPageData = {
  players: ScoreSaberPlayersPageToken | undefined;
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

  const players =
    country == undefined
      ? await scoresaberService.lookupPlayers(page)
      : await scoresaberService.lookupPlayersByCountry(page, country);
  return {
    players: players && players.players.length > 0 ? players : undefined,
    page,
    country,
  };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { players, page, country } = await getRankingData(props);
  if (players === undefined) {
    return {
      title: UNKNOWN_PAGE.title,
      description: UNKNOWN_PAGE.description,
      openGraph: {
        siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
        title: UNKNOWN_PAGE.title,
        description: UNKNOWN_PAGE.description,
      },
    };
  }

  const title = `Ranking Page (${page} - ${country === undefined ? "Global" : country})`;
  return {
    title: title,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title: title,
      description: `
      Page: ${page}
      ${country != undefined ? `Country: ${country}` : ""}
      
      View the scores for the ranking page!`,
      images: [
        {
          // Show the profile picture of the first player
          url: players.players[0].profilePicture,
        },
      ],
    },
    twitter: {
      card: "summary",
    },
  };
}

export default async function RankingPage(props: Props) {
  const { players, page, country } = await getRankingData(props);

  return (
    <main className="flex w-full flex-col items-center text-sm">
      <RankingData initialPage={page} initialPageData={players} country={country} />
    </main>
  );
}
