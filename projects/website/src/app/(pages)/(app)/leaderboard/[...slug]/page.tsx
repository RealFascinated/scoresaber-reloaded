import { Metadata } from "next";
import { redirect } from "next/navigation";
import { LeaderboardData } from "@/components/leaderboard/page/leaderboard-data";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { Config } from "@ssr/common/config";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ScoreModeEnum } from "@/components/score/score-mode";
import { DetailType } from "@ssr/common/detail-type";
import { getDifficulty } from "@ssr/common/utils/song-utils";

export const revalidate = 300; // Revalidate every 5 minutes

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
  type: DetailType = DetailType.BASIC
): Promise<LeaderboardData | undefined> => {
  const { slug } = await params;
  const id = slug[0]; // The leaderboard id
  const page = parseInt(slug[1]) || 1; // The page number
  const category = (await searchParams).category as ScoreModeEnum;

  const leaderboard = await ssrApi.fetchLeaderboard(id + "", type);
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
  const difficulty = getDifficulty(leaderboard.difficulty.difficulty);

  return {
    title: `${leaderboard.fullName}`,
    openGraph: {
      siteName: "ScoreSaber Reloaded",
      title: `${leaderboard.fullName}`,
      description: `Plays: ${leaderboard.plays} (${leaderboard.dailyPlays} Daily)
Mapped by: ${leaderboard.songAuthorName}
Difficulty: ${difficulty.alternativeName ?? difficulty.name}${leaderboard.stars > 0 ? ` (${leaderboard.stars}★)` : ""}

Click here to view the scores for ${leaderboard.fullName}!`,
      images: [
        {
          url: leaderboard.songArt,
        },
      ],
    },
  };
}

export default async function LeaderboardPage(props: Props) {
  const response = await getLeaderboardData(props, DetailType.FULL);
  if (response == undefined) {
    return redirect("/");
  }
  return (
    <main className="w-full flex justify-center">
      <LeaderboardData
        initialLeaderboard={response.leaderboardResponse}
        initialPage={response.page}
        initialCategory={response.category}
      />
    </main>
  );
}
