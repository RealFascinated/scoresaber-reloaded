import { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Colors } from "@/common/colors";
import { getAverageColor } from "@/common/image-utils";
import { LeaderboardData } from "@/components/leaderboard/leaderboard-data";
import { Config } from "@ssr/common/config";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { fetchLeaderboard } from "@ssr/common/utils/leaderboard.util";
import { fetchLeaderboardScores } from "@ssr/common/utils/score-utils";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import { SSRCache } from "@ssr/common/cache";

const UNKNOWN_LEADERBOARD = {
  title: "ScoreSaber Reloaded - Unknown Leaderboard",
  description: "The leaderboard you were looking for could not be found.",
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
  scores?: LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;
  page: number;
};

const leaderboardCache = new SSRCache({
  ttl: 1000 * 60, // 1 minute
});

/**
 * Gets the leaderboard data and scores
 *
 * @param params the params
 * @param fetchScores whether to fetch the scores
 * @returns the leaderboard data and scores
 */
const getLeaderboardData = async (
  { params }: Props,
  fetchScores: boolean = true
): Promise<LeaderboardData | undefined> => {
  const { slug } = await params;
  const id = slug[0]; // The leaderboard id
  const page = parseInt(slug[1]) || 1; // The page number

  const cacheId = `${id}-${page}-${fetchScores}`;
  if (leaderboardCache.has(cacheId)) {
    return leaderboardCache.get(cacheId) as LeaderboardData;
  }
  const leaderboard = await fetchLeaderboard<ScoreSaberLeaderboard>("scoresaber", id + "");
  if (leaderboard === undefined) {
    return undefined;
  }

  const scores = fetchScores
    ? await fetchLeaderboardScores<ScoreSaberScore, ScoreSaberLeaderboard>("scoresaber", id + "", page)
    : undefined;
  const leaderboardData: LeaderboardData = {
    leaderboardResponse: leaderboard,
    page: page,
    scores: scores,
  };

  leaderboardCache.set(cacheId, leaderboardData);
  return leaderboardData;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const response = await getLeaderboardData(props, false);
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
    title: `${leaderboard.songName} ${leaderboard.songSubName} by ${leaderboard.songAuthorName}`,
    openGraph: {
      title: `ScoreSaber Reloaded - ${leaderboard.songName} ${leaderboard.songSubName}`,
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

export async function generateViewport(props: Props): Promise<Viewport> {
  const response = await getLeaderboardData(props, false);
  if (response === undefined) {
    return {
      themeColor: Colors.primary,
    };
  }

  const color = await getAverageColor(response.leaderboardResponse.leaderboard.songArt);
  return {
    themeColor: color.color,
  };
}

export default async function LeaderboardPage(props: Props) {
  const response = await getLeaderboardData(props);
  if (response == undefined) {
    return redirect("/");
  }
  return (
    <LeaderboardData
      initialLeaderboard={response.leaderboardResponse}
      initialScores={response.scores}
      initialPage={response.page}
    />
  );
}
