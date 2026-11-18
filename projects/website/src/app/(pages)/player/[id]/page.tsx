import { isBackendUnavailableError } from "@/common/api-error";
import { fetchPlayerFollows } from "@/common/following/following-api";
import { prefetchInitialData, prefetchTimestampedData } from "@/common/server-prefetch";
import BackendUnavailable from "@/components/api/backend-unavailable";
import NotFound from "@/components/not-found";
import {
  buildPlayerLiveScoresQuery,
  loadPlayerLiveScoresSearchParams,
  type PlayerLiveScoresInitialData,
} from "@/components/platform/scoresaber/player-scores-live-query";
import { miniRankingQueryKey } from "@/components/player/mini-ranking/mini-ranking-query";
import PlayerData from "@/components/player/player-data";
import { playerFollowsQueryKey } from "@/hooks/use-following";
import { env } from "@ssr/common/env";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { ssrConfig } from "config";
import type { SearchParams } from "nuqs/server";
import { cache } from "react";

const UNKNOWN_PLAYER = {
  title: "Unknown Player",
  description: "The player you were looking for could not be found",
};

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParams>;
};

type PlayerFetchResult =
  | { status: "found"; player: ScoreSaberPlayer }
  | { status: "not-found" }
  | { status: "unavailable" };

const getPlayer = cache(async (id: string) => {
  try {
    const player = await ssrApi.getScoreSaberPlayer(id, "full");
    const result: PlayerFetchResult =
      player === undefined ? { status: "not-found" } : { status: "found", player };
    return result;
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      const result: PlayerFetchResult = { status: "unavailable" };
      return result;
    }
    throw error;
  }
});

export async function generateMetadata(props: Props) {
  const { id } = await props.params;
  const result = await getPlayer(id);

  if (result.status === "unavailable") {
    return {
      title: "Backend Unavailable",
      description: "The backend is currently offline or unreachable. Please try again later.",
    };
  }

  if (result.status === "not-found") {
    return {
      title: UNKNOWN_PLAYER.title,
      description: UNKNOWN_PLAYER.description,
      openGraph: {
        siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
        title: UNKNOWN_PLAYER.title,
        description: UNKNOWN_PLAYER.description,
        images: ["/icon-512x512.png"],
      },
    };
  }

  const { player } = result;

  return {
    title: `${player.name}`,
    description: `${player.name}'s Beat Saber profile: rank #${formatNumberWithCommas(player.rank)} globally, #${formatNumberWithCommas(player.countryRank)} in ${player.country}, ${formatPp(player.pp)}pp. View their scores, stats and history on ScoreSaber Reloaded.`,
    alternates: {
      canonical: `/player/${player.id}`,
    },
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
      title: `${player.name}`,
      description: `Rank: #${formatNumberWithCommas(player.rank)}
Country Rank: #${formatNumberWithCommas(player.countryRank)} (${player.country})
PP: ${formatPp(player.pp)}pp
HMD: ${player.hmd ?? "Unknown"}
Joined: ${formatDate(player.joinedDate, "Do MMMM, YYYY")}`,
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
  const { id } = await props.params;
  const result = await getPlayer(id);

  if (result.status === "unavailable") {
    return <BackendUnavailable />;
  }

  if (result.status === "not-found") {
    return (
      <NotFound title="Player Not Found" description="The player you were looking for could not be found" />
    );
  }

  const { page, sort, search, platform } = loadPlayerLiveScoresSearchParams(await props.searchParams);
  const followsPromise = prefetchInitialData(fetchPlayerFollows(result.player.id));
  const miniRankingPromise = prefetchInitialData(ssrApi.getPlayerMiniRanking(result.player.id));
  let initialScores: PlayerLiveScoresInitialData | undefined;
  if (platform === null) {
    const query = buildPlayerLiveScoresQuery(page, sort, search);
    const prefetched = await prefetchTimestampedData(
      ssrApi.fetchScoreSaberPlayerScores(result.player.id, query.page, query.sort, query.search)
    );
    initialScores = prefetched ? { query, ...prefetched } : undefined;
  }

  const queryClient = new QueryClient();
  const [follows, miniRanking] = await Promise.all([followsPromise, miniRankingPromise]);
  if (follows) {
    queryClient.setQueryData(playerFollowsQueryKey(result.player.id), follows);
  }
  if (miniRanking) {
    queryClient.setQueryData(miniRankingQueryKey(result.player.id), miniRanking);
  }

  return (
    <section className="w-full">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PlayerData player={result.player} initialScores={initialScores} />
      </HydrationBoundary>
    </section>
  );
}
