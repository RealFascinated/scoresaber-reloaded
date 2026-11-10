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
import { Metadata } from "next";
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
  { status: "found"; player: ScoreSaberPlayer } | { status: "not-found" } | { status: "unavailable" };

const getPlayer = cache(async (id: string): Promise<PlayerFetchResult> => {
  try {
    const player = await ssrApi.getScoreSaberPlayer(id, "full");
    if (player === undefined) {
      return { status: "not-found" };
    }
    return { status: "found", player };
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return { status: "unavailable" };
    }
    throw error;
  }
});

export async function generateMetadata(props: Props): Promise<Metadata> {
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

  // Render the ScoreSaber scores on the server so they are part of the HTML crawlers and users first
  // receive. The other score tabs are only shown when selected, so the client fetches those.
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

  // The follower counts and the mini rankings are part of the page layout. Rendered later they push content
  // around (or leave an empty row), so they are seeded into the client's cache like the scores.
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
