import NotFound from "@/components/not-found";
import { ScoreSaberLeaderboardData } from "@/components/platform/scoresaber/leaderboard/page/leaderboard-data";
import { env } from "@ssr/common/env";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { Metadata } from "next";

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

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const response = await ssrApi.fetchLeaderboard(id, "basic");
  if (response === undefined) {
    return {
      title: UNKNOWN_LEADERBOARD.title,
      description: UNKNOWN_LEADERBOARD.description,
      openGraph: {
        siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
        title: UNKNOWN_LEADERBOARD.title,
        description: UNKNOWN_LEADERBOARD.description,
      },
    };
  }

  const { leaderboard } = response;

  return {
    title: `${leaderboard.fullName} - ${leaderboard.songAuthorName}`,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
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
  const response = await ssrApi.fetchLeaderboard(id, "full");
  if (response == undefined) {
    return (
      <NotFound
        title="Leaderboard Not Found"
        description="The leaderboard you were looking for could not be found"
      />
    );
  }
  return (
    <main className="flex w-full justify-center">
      <ScoreSaberLeaderboardData leaderboardData={response} />
    </main>
  );
}
