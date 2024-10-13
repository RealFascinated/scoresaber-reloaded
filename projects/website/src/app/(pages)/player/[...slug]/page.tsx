import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import PlayerData from "@/components/player/player-data";
import { format } from "@formkit/tempo";
import { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Colors } from "@/common/colors";
import { getAverageColor } from "@/common/image-utils";
import { ScoreSort } from "@ssr/common/types/score/score-sort";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberPlayerScoresPageToken from "@ssr/common/types/token/scoresaber/score-saber-player-scores-page-token";
import ScoreSaberPlayer, { getScoreSaberPlayerFromToken } from "@ssr/common/types/player/impl/scoresaber-player";
import { config } from "../../../../../config";
import NodeCache from "node-cache";
import { getCookieValue } from "@/common/cookie-utils";

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

type PlayerData = {
  player: ScoreSaberPlayer | undefined;
  scores: ScoreSaberPlayerScoresPageToken | undefined;
  sort: ScoreSort;
  page: number;
  search: string;
};

const playerCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

/**
 * Gets the player data and scores
 *
 * @param params the params
 * @param fetchScores whether to fetch the scores
 * @returns the player data and scores
 */
const getPlayerData = async ({ params }: Props, fetchScores: boolean = true): Promise<PlayerData> => {
  const { slug } = await params;
  const id = slug[0]; // The players id
  const sort: ScoreSort = (slug[1] as ScoreSort) || (await getCookieValue("lastScoreSort", "recent")); // The sorting method
  const page = parseInt(slug[2]) || 1; // The page number
  const search = (slug[3] as string) || ""; // The search query

  const cacheId = `${id}-${sort}-${page}-${search}-${fetchScores}`;
  if (playerCache.has(cacheId)) {
    return playerCache.get(cacheId) as PlayerData;
  }

  const playerToken = await scoresaberService.lookupPlayer(id);
  const player =
    playerToken && (await getScoreSaberPlayerFromToken(playerToken, config.siteApi, await getCookieValue("playerId")));
  let scores: ScoreSaberPlayerScoresPageToken | undefined;
  if (fetchScores) {
    scores = await scoresaberService.lookupPlayerScores({
      playerId: id,
      sort,
      page,
      search,
    });
  }

  const playerData = {
    sort: sort,
    page: page,
    search: search,
    player: player,
    scores: scores,
  };
  playerCache.set(cacheId, playerData);
  return playerData;
};

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
