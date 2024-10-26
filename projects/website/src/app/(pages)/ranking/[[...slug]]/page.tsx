import { Metadata } from "next";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreSaberPlayersPageToken } from "@ssr/common/types/token/scoresaber/score-saber-players-page-token";
import Card from "@/components/card";
import RankingData from "@/components/ranking/ranking-data";
import CountryFlag from "@/components/country-flag";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import { cache } from "react";

const UNKNOWN_PAGE = {
  title: "ScoreSaber Reloaded - Unknown Page",
  description: "The page you were looking for could not be found.",
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
const getRankingData = cache(async ({ params }: Props): Promise<RankingPageData> => {
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
});

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { players, page, country } = await getRankingData(props);
  if (players === undefined) {
    return {
      title: UNKNOWN_PAGE.title,
      description: UNKNOWN_PAGE.description,
      openGraph: {
        title: UNKNOWN_PAGE.title,
        description: UNKNOWN_PAGE.description,
      },
    };
  }

  const title = `ScoreSaber Reloaded - Ranking Page (${page} - ${country === undefined ? "Global" : country})`;
  return {
    title: title,
    openGraph: {
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
    <Card className="h-full w-full gap-2">
      <div className="flex items-center gap-2 font-semibold">
        {country && <CountryFlag code={country} size={16} />}
        <p>
          You are viewing {country ? "players from " + normalizedRegionName(country.toUpperCase()) : "Global players"}
        </p>
      </div>

      <RankingData initialPage={page} initialPageData={players} country={country} />
    </Card>
  );
}
