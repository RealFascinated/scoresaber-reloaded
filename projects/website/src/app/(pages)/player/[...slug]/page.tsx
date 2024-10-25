import PlayerData from "@/components/player/player-data";
import { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Colors } from "@/common/colors";
import { getAverageColor } from "@/common/image-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { getCookieValue } from "@ssr/common/utils/cookie-utils";
import { Config } from "@ssr/common/config";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { fetchPlayerScores } from "@ssr/common/utils/score-utils";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { SSRCache } from "@ssr/common/cache";
import { getScoreSaberPlayerFromToken } from "@ssr/common/token-creators";
import { ScoreSortType } from "@ssr/common/sorter/sort-type";
import { SortDirection } from "@ssr/common/sorter/sort-direction";

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
  scores: PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard> | undefined;
  sort: ScoreSortType;
  direction: SortDirection;
  page: number;
  search: string;
};

const playerCache = new SSRCache({
  ttl: 1000 * 60, // 1 minute
});

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
  const sort: ScoreSortType = (slug[1] as ScoreSortType) || (await getCookieValue("lastScoreSort", ScoreSortType.date)); // The sorting method
  const direction: SortDirection =
    (slug[2] as SortDirection) || (await getCookieValue("lastScoreSortDirection", SortDirection.DESC)); // The sorting direction
  const page = parseInt(slug[3]) || 1; // The page number
  const search = (slug[4] as string) || ""; // The search query

  const cacheId = `${id}-${sort}-${page}-${search}-${fetchScores}`;
  if (playerCache.has(cacheId)) {
    return playerCache.get(cacheId) as PlayerData;
  }

  const playerToken = await scoresaberService.lookupPlayer(id);
  const player = playerToken && (await getScoreSaberPlayerFromToken(playerToken, await getCookieValue("playerId")));
  let scores: PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard> | undefined;
  if (fetchScores) {
    scores = await fetchPlayerScores<ScoreSaberScore, ScoreSaberLeaderboard>(
      "scoresaber",
      id,
      page,
      sort,
      direction,
      search
    );
  }

  const playerData = {
    sort: sort,
    direction: direction,
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
      description: `Click here to view the scores for ${player.name}!`,
      images: [
        {
          url: `${Config.apiUrl}/image/player/${player.id}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
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
  return {
    themeColor: color.color,
  };
}

export default async function PlayerPage(props: Props) {
  const { player, scores, sort, direction, page, search } = await getPlayerData(props);
  if (player == undefined) {
    return redirect("/");
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PlayerData
        initialPlayerData={player}
        initialScoreData={scores}
        initialSearch={search}
        sort={sort}
        direction={direction}
        page={page}
      />
    </div>
  );
}
