import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import NotFound from "@/components/not-found";
import { ScoreSaberLeaderboardData } from "@/components/platform/scoresaber/leaderboard/page/leaderboard-data";
import { env } from "@ssr/common/env";
import type { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import { cache } from "react";

export const revalidate = 300; // Revalidate every 5 minutes

const UNKNOWN_LEADERBOARD = {
  title: "Unknown Leaderboard",
  description: "The leaderboard you were looking for could not be found",
};

type Props = {
  params: Promise<{
    id: number;
  }>;
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

  let response: LeaderboardResponse | undefined;
  try {
    response = await ssrApi.fetchLeaderboard(id, "basic");
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return {
        title: "Backend Unavailable",
        description: "The backend is currently offline or unreachable. Please try again later.",
      };
    }
    throw error;
  }

  if (response === undefined) {
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

  const { leaderboard } = response;

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

  let starChangeHistory;
  try {
    starChangeHistory = await ssrApi.getLeaderboardStarHistory(id);
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return <BackendUnavailable />;
    }
    throw error;
  }

  return (
    <section className="flex w-full justify-center">
      <ScoreSaberLeaderboardData
        leaderboardData={result.response}
        starChangeHistory={starChangeHistory ?? []}
      />
    </section>
  );
}
