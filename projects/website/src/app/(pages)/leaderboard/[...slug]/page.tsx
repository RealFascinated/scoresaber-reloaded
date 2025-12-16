import NotFound from "@/components/not-found";
import { ScoreSaberLeaderboardData } from "@/components/platform/scoresaber/leaderboard/page/leaderboard-data";
import { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { DetailType } from "@ssr/common/detail-type";
import { env } from "@ssr/common/env";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
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
    slug: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | undefined;
  }>;
};

type LeaderboardData = {
  leaderboardResponse: LeaderboardResponse;
  page: number;
  category: ScoreModeEnum;
};

/**
 * Gets the leaderboard data and scores
 *
 * @param params the params
 * @param fetchScores whether to fetch the scores
 * @returns the leaderboard data and scores
 */
const getLeaderboardData = async (
  { params, searchParams }: Props,
  type: DetailType = "basic"
): Promise<LeaderboardData | undefined> => {
  const { slug } = await params;
  const id = parseInt(slug[0]); // The leaderboard id
  const page = parseInt(slug[1]) || 1; // The page number
  const category = (await searchParams).category as ScoreModeEnum;

  const leaderboard = await ssrApi.fetchLeaderboard(id, type);
  if (leaderboard === undefined) {
    return undefined;
  }
  return {
    leaderboardResponse: leaderboard,
    page: page,
    category: category,
  };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const response = await getLeaderboardData(props, "full");
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

  const { leaderboard } = response.leaderboardResponse;

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
  const response = await getLeaderboardData(props, "full");
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
      <ScoreSaberLeaderboardData
        initialLeaderboard={response.leaderboardResponse}
        initialPage={response.page}
        initialCategory={response.category}
      />
    </main>
  );
}
