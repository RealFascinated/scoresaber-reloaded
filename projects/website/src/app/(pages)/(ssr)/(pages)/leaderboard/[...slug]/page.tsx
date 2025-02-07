import { LeaderboardData } from "@/components/leaderboard/page/leaderboard-data";
import { ScoreModeEnum } from "@/components/score/score-mode";
import { Config } from "@ssr/common/config";
import { DetailType } from "@ssr/common/detail-type";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { Metadata } from "next";
import { redirect } from "next/navigation";

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
  const response = await getLeaderboardData(props, DetailType.FULL);
  if (response === undefined) {
    return {
      title: UNKNOWN_LEADERBOARD.title,
      description: UNKNOWN_LEADERBOARD.description,
      openGraph: {
        siteName: Config.websiteName,
        title: UNKNOWN_LEADERBOARD.title,
        description: UNKNOWN_LEADERBOARD.description,
      },
    };
  }

  const { leaderboard } = response.leaderboardResponse;

  return {
    title: `${leaderboard.fullName} - ${leaderboard.songAuthorName}`,
    openGraph: {
      siteName: Config.websiteName,
      title: `${leaderboard.fullName} - ${leaderboard.songAuthorName}`,
      description: `Plays: ${leaderboard.plays} (${leaderboard.dailyPlays} Daily)
Mapped by: ${leaderboard.songAuthorName}
Difficulty: ${getDifficultyName(leaderboard.difficulty.difficulty)}${leaderboard.stars > 0 ? ` (${leaderboard.stars}★)` : ""}

Click here to view the scores for ${leaderboard.fullName}`,
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
