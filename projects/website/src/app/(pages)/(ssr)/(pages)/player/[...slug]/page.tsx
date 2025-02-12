import { getCookieValue } from "@/common/cookie.util";
import NotFound from "@/components/not-found";
import PlayerData from "@/components/player/player-data";
import { Config } from "@ssr/common/config";
import { DetailType } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

const UNKNOWN_PLAYER = {
  title: "Unknown Player",
  description: "The player you were looking for could not be found",
};

type Props = {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | undefined;
  }>;
};

type PlayerData = {
  player: ScoreSaberPlayer | undefined;
  sort: ScoreSort;
  page: number;
  search: string;
};

/**
 * Gets the player data and scores
 *
 * @param params the params
 * @returns the player data and scores
 */
const getPlayerData = async (
  { params }: Props,
  type: DetailType = DetailType.FULL
): Promise<PlayerData> => {
  const { slug } = await params;
  const id = slug[0]; // The players id
  const sort: ScoreSort =
    (slug[1] as ScoreSort) || (await getCookieValue("lastScoreSort", ScoreSort.recent)); // The sorting method
  const page = parseInt(slug[2]) || 1; // The page number
  const search = (slug[3] as string) || ""; // The search query

  const player = await ssrApi.getScoreSaberPlayer(id, { type: type });
  return {
    sort: sort,
    page: page,
    search: search,
    player: player,
  };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { player } = await getPlayerData(props, DetailType.FULL);
  if (player === undefined) {
    return {
      title: UNKNOWN_PLAYER.title,
      description: UNKNOWN_PLAYER.description,
      openGraph: {
        siteName: Config.websiteName,
        title: UNKNOWN_PLAYER.title,
        description: UNKNOWN_PLAYER.description,
      },
    };
  }

  return {
    title: `${player.name}`,
    openGraph: {
      siteName: Config.websiteName,
      title: `${player.name}`,
      description: `Rank: #${player.rank}
Country Rank: #${player.countryRank} (${player.country})
PP: ${formatPp(player.pp)}pp

Click here to view the scores for ${player.name}`,
      images: [
        {
          url: player.avatar,
        },
      ],
    },
    twitter: {
      card: "summary",
    },
  };
}

export default async function PlayerPage(props: Props) {
  const { player, sort, page, search } = await getPlayerData(props);
  if (player == undefined) {
    return (
      <main className="w-full flex justify-center mt-2">
        <NotFound
          title="Player Not Found"
          description="The player you were looking for could not be found"
        />
      </main>
    );
  }

  return (
    <main className="w-full flex justify-center">
      <PlayerData initialPlayerData={player} initialSearch={search} sort={sort} page={page} />
    </main>
  );
}
