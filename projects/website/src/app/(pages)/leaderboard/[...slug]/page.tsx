import { Metadata } from "next";
import { redirect } from "next/navigation";
import { LeaderboardData } from "@/components/leaderboard/leaderboard-data";
import { Config } from "@ssr/common/config";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { fetchLeaderboard } from "@ssr/common/utils/leaderboard.util";
import { cache } from "react";

type Props = {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | undefined;
  }>;
};

type LeaderboardData = {
  leaderboardResponse: LeaderboardResponse<ScoreSaberLeaderboard>;
  page: number;
};

const getLeaderboard = cache(async (id: string): Promise<LeaderboardResponse<ScoreSaberLeaderboard> | undefined> => {
  return await fetchLeaderboard<ScoreSaberLeaderboard>("scoresaber", id + "");
});

/**
 * Gets the leaderboard data and scores
 *
 * @param params the params
 * @param fetchScores whether to fetch the scores
 * @returns the leaderboard data and scores
 */
const getLeaderboardData = cache(async ({ params }: Props): Promise<LeaderboardData | undefined> => {
  const { slug } = await params;
  const id = slug[0]; // The leaderboard id
  const page = parseInt(slug[1]) || 1; // The page number

  const leaderboard = await getLeaderboard(id);
  if (leaderboard === undefined) {
    return undefined;
  }
  return {
    leaderboardResponse: leaderboard,
    page: page,
  };
});

export async function generateMetadata(props: Props): Promise<Metadata> {
  const UNKNOWN_LEADERBOARD = {
    title: "ScoreSaber Reloaded - Unknown Leaderboard",
    description: "The leaderboard you were looking for could not be found.",
  };

  const response = await getLeaderboardData(props);
  if (response === undefined) {
    return {
      title: UNKNOWN_LEADERBOARD.title,
      description: UNKNOWN_LEADERBOARD.description,
      openGraph: {
        title: UNKNOWN_LEADERBOARD.title,
        description: UNKNOWN_LEADERBOARD.description,
      },
    };
  }

  const { leaderboard } = response.leaderboardResponse;
  return {
    title: `${leaderboard.fullName} by ${leaderboard.songAuthorName}`,
    openGraph: {
      title: `ScoreSaber Reloaded - ${leaderboard.fullName}`,
      description: `View the scores for ${leaderboard.songName} by ${leaderboard.songAuthorName}!`,
      images: [
        {
          url: `${Config.apiUrl}/image/leaderboard/${leaderboard.id}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function LeaderboardPage(props: Props) {
  const response = await getLeaderboardData(props);
  if (response == undefined) {
    return redirect("/");
  }
  return (
    <main className="w-full flex justify-center">
      <LeaderboardData initialLeaderboard={response.leaderboardResponse} initialPage={response.page} />
    </main>
  );
}
