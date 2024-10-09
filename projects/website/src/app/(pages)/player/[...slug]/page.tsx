import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import PlayerData from "@/components/player/player-data";
import { format } from "@formkit/tempo";
import { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Colors } from "@/common/colors";
import { getAverageColor } from "@/common/image-utils";
import { cache } from "react";
import { ScoreSort } from "@ssr/common/types/score/score-sort";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberPlayerScoresPageToken from "@ssr/common/types/token/scoresaber/score-saber-player-scores-page-token";
import { getScoreSaberPlayerFromToken } from "@ssr/common/types/player/impl/scoresaber-player";
import { config } from "../../../../../config";
import { getPlayerIdCookie } from "@/common/website-utils";

const UNKNOWN_PLAYER = {
  title: "ScoreSaber Reloaded - Unknown Player",
  description: "The player you were looking for could not be found.",
};

type Props = {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | undefined;
  }>;
};

/**
 * Gets the player data and scores
 *
 * @param params the params
 * @param fetchScores whether to fetch the scores
 * @returns the player data and scores
 */
const getPlayerData = cache(async ({ params }: Props, fetchScores: boolean = true) => {
  const { slug } = await params;
  const id = slug[0]; // The players id
  const sort: ScoreSort = (slug[1] as ScoreSort) || "recent"; // The sorting method
  const page = parseInt(slug[2]) || 1; // The page number
  const search = (slug[3] as string) || ""; // The search query

  const playerToken = await scoresaberService.lookupPlayer(id);
  const player = playerToken && (await getScoreSaberPlayerFromToken(playerToken, config.siteApi, getPlayerIdCookie()));
  let scores: ScoreSaberPlayerScoresPageToken | undefined;
  if (fetchScores) {
    scores = await scoresaberService.lookupPlayerScores({
      playerId: id,
      sort,
      page,
      search,
    });
  }

  return {
    sort: sort,
    page: page,
    search: search,
    player: player,
    scores: scores,
  };
});

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { player } = await getPlayerData(props, false);
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
      description: `
      PP: ${formatPp(player.pp)}pp
      Rank: #${formatNumberWithCommas(player.rank)} (#${formatNumberWithCommas(player.countryRank)} ${player.country})
      Joined ScoreSaber: ${format(player.joinedDate, { date: "medium", time: "short" })}
      
      View the scores for ${player.name}!`,
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

export async function generateViewport(props: Props): Promise<Viewport> {
  const { player } = await getPlayerData(props, false);
  if (player === undefined) {
    return {
      themeColor: Colors.primary,
    };
  }

  const color = await getAverageColor(player.avatar);
  if (color === undefined) {
    return {
      themeColor: Colors.primary,
    };
  }

  return {
    themeColor: color?.hex,
  };
}

export default async function PlayerPage(props: Props) {
  const { player, scores, sort, page, search } = await getPlayerData(props);
  if (player == undefined) {
    return redirect("/");
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PlayerData initialPlayerData={player} initialScoreData={scores} initialSearch={search} sort={sort} page={page} />
    </div>
  );
}
