import { isBackendUnavailableError } from "@/common/api-error";
import { prefetchTimestampedData } from "@/common/server-prefetch";
import BackendUnavailable from "@/components/api/backend-unavailable";
import NotFound from "@/components/not-found";
import {
  loadLeaderboardScoresSearchParams,
  toLeaderboardScoresPage,
  type LeaderboardScoresInitialData,
  type LeaderboardScoresQuery,
} from "@/components/platform/scoresaber/leaderboard/leaderboard-scores-query";
import { ScoreSaberLeaderboardData } from "@/components/platform/scoresaber/leaderboard/page/leaderboard-data";
import { ScoreModeEnum } from "@/components/score/score-mode";
import { env } from "@ssr/common/env";
import type { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { cache } from "react";

export const revalidate = 300;

const UNKNOWN_LEADERBOARD = {
  title: "Unknown Leaderboard",
  description: "The leaderboard you were looking for could not be found",
};

type Props = {
  params: Promise<{
    id: number;
  }>;
  searchParams: Promise<SearchParams>;
};

type LeaderboardFetchResult =
  { status: "found"; response: LeaderboardResponse } | { status: "not-found" } | { status: "unavailable" };

const getLeaderboard = cache(async (id: number): Promise<LeaderboardFetchResult> => {
  try {
    const response = await ssrApi.fetchLeaderboard(id, "full");
    if (response === undefined) {
      return { status: "not-found" };
    }
    return { status: "found", response };
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return { status: "unavailable" };
    }
    throw error;
  }
});

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;

  // Shares the page's request, so the leaderboard is only fetched once per render
  const result = await getLeaderboard(id);

  if (result.status === "unavailable") {
    return {
      title: "Backend Unavailable",
      description: "The backend is currently offline or unreachable. Please try again later.",
    };
  }

  if (result.status === "not-found") {
    return {
      title: UNKNOWN_LEADERBOARD.title,
      description: UNKNOWN_LEADERBOARD.description,
      openGraph: {
        siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
        title: UNKNOWN_LEADERBOARD.title,
        description: UNKNOWN_LEADERBOARD.description,
        images: ["/icon-512x512.png"],
      },
    };
  }

  const { leaderboard } = result.response;

  return {
    title: `${leaderboard.fullName} - ${leaderboard.songAuthorName}`,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
      title: `${leaderboard.fullName} - ${leaderboard.songAuthorName}`,
      description: `Plays: ${leaderboard.plays} (${leaderboard.dailyPlays} Daily)
Mapped by: ${leaderboard.songAuthorName}
Difficulty: ${getDifficultyName(leaderboard.difficulty.difficulty)}${leaderboard.stars > 0 ? ` (${leaderboard.stars}★)` : ""}`,
      images: [
        {
          url: leaderboard.songArt,
        },
      ],
    },
    twitter: {
      card: "summary",
    },
  };
}

export default async function LeaderboardPage(props: Props) {
  const { id } = await props.params;
  const result = await getLeaderboard(id);

  if (result.status === "unavailable") {
    return <BackendUnavailable />;
  }

  if (result.status === "not-found") {
    return (
      <NotFound
        title="Leaderboard Not Found"
        description="The leaderboard you were looking for could not be found"
      />
    );
  }

  // Render the global scores on the server so they are part of the HTML crawlers and users first receive.
  // The other modes depend on the signed-in player, so the client fetches those.
  const { page, mode, country } = loadLeaderboardScoresSearchParams(await props.searchParams);
  const scoresQuery: LeaderboardScoresQuery = {
    leaderboardId: result.response.leaderboard.id,
    page,
    country: country ?? undefined,
  };
  const scoresRequest =
    mode === ScoreModeEnum.Global
      ? prefetchTimestampedData(
          ssrApi.fetchLeaderboardScores(String(scoresQuery.leaderboardId), page, scoresQuery.country)
        )
      : undefined;

  let starChangeHistory;
  try {
    starChangeHistory = await ssrApi.getLeaderboardStarHistory(id);
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return <BackendUnavailable />;
    }
    throw error;
  }

  const prefetchedScores = await scoresRequest;
  const initialScores: LeaderboardScoresInitialData | undefined = prefetchedScores
    ? {
        query: scoresQuery,
        data: toLeaderboardScoresPage(prefetchedScores.data),
        fetchedAt: prefetchedScores.fetchedAt,
      }
    : undefined;

  return (
    <section className="flex w-full justify-center">
      <ScoreSaberLeaderboardData
        leaderboardData={result.response}
        starChangeHistory={starChangeHistory ?? []}
        initialScores={initialScores}
      />
    </section>
  );
}
