import PlayerData from "@/components/player/player-data";
import { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Colors } from "@/common/colors";
import { getAverageColor } from "@/common/image-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { getCookieValue } from "@ssr/common/utils/cookie-utils";
import { Config } from "@ssr/common/config";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { fetchPlayerScores } from "@ssr/common/utils/score-utils";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { SSRCache } from "@ssr/common/cache";
import { getScoreSaberPlayerFromToken } from "@ssr/common/token-creators";

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
  sort: ScoreSort;
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
  const sort: ScoreSort = (slug[1] as ScoreSort) || (await getCookieValue("lastScoreSort", "recent")); // The sorting method
  const page = parseInt(slug[2]) || 1; // The page number
  const search = (slug[3] as string) || ""; // The search query

  const cacheId = `${id}-${sort}-${page}-${search}-${fetchScores}`;
  if (playerCache.has(cacheId)) {
    return playerCache.get(cacheId) as PlayerData;
  }

  const playerToken = await scoresaberService.lookupPlayer(id);
  const player = playerToken && (await getScoreSaberPlayerFromToken(playerToken, await getCookieValue("playerId")));
  let scores: PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard> | undefined;
  if (fetchScores) {
    scores = await fetchPlayerScores<ScoreSaberScore, ScoreSaberLeaderboard>("scoresaber", id, page, sort, search);
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
