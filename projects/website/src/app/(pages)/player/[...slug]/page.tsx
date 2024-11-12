import PlayerData from "@/components/player/player-data";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCookieValue } from "@ssr/common/utils/cookie-utils";
import { Config } from "@ssr/common/config";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { cache } from "react";
import { randomString } from "@ssr/common/utils/string.util";
import { getScoreSaberPlayer } from "@ssr/common/utils/player-utils";

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

const getPlayer = cache(async (id: string): Promise<ScoreSaberPlayer | undefined> => {
  return await getScoreSaberPlayer(id);
});

/**
 * Gets the player data and scores
 *
 * @param params the params
 * @returns the player data and scores
 */
const getPlayerData = cache(async ({ params }: Props): Promise<PlayerData> => {
  const { slug } = await params;
  const id = slug[0]; // The players id
  const sort: ScoreSort = (slug[1] as ScoreSort) || (await getCookieValue("lastScoreSort", ScoreSort.recent)); // The sorting method
  const page = parseInt(slug[2]) || 1; // The page number
  const search = (slug[3] as string) || ""; // The search query

  const player = await getPlayer(id);
  return {
    sort: sort,
    page: page,
    search: search,
    player: player,
  };
});

export async function generateMetadata(props: Props): Promise<Metadata> {
  const UNKNOWN_PLAYER = {
    title: "ScoreSaber Reloaded - Unknown Player",
    description: "The player you were looking for could not be found.",
  };

  const { player } = await getPlayerData(props);
  if (player === undefined) {
    return {
      title: UNKNOWN_PLAYER.title,
      description: UNKNOWN_PLAYER.description,
      openGraph: {
        title: UNKNOWN_PLAYER.title,
        description: UNKNOWN_PLAYER.description,
      },
    };
  }

  return {
    title: `${player.name}`,
    openGraph: {
      title: `ScoreSaber Reloaded - ${player.name}`,
      description: `Click here to view the scores for ${player.name}!`,
      images: [
        {
          url: `${Config.apiUrl}/image/player/${player.id}?id=${randomString(8)}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function PlayerPage(props: Props) {
  const { player, sort, page, search } = await getPlayerData(props);
  if (player == undefined) {
    return redirect("/");
  }

  return (
    <main className="w-full flex justify-center">
      <div className="flex flex-col h-full w-full max-w-[1600px]">
        <PlayerData initialPlayerData={player} initialSearch={search} sort={sort} page={page} />
      </div>
    </main>
  );
}
