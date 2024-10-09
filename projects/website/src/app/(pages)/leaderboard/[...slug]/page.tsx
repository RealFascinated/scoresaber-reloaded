import { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Colors } from "@/common/colors";
import { getAverageColor } from "@/common/image-utils";
import { LeaderboardData } from "@/components/leaderboard/leaderboard-data";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberLeaderboardScoresPageToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-scores-page-token";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";

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
  leaderboard: ScoreSaberLeaderboardToken | undefined;
  scores: ScoreSaberLeaderboardScoresPageToken | undefined;
  page: number;
};

/**
 * Gets the leaderboard data and scores
 *
 * @param params the params
 * @param fetchScores whether to fetch the scores
 * @returns the leaderboard data and scores
 */
const getLeaderboardData = async ({ params }: Props, fetchScores: boolean = true) => {
  const { slug } = await params;
  const id = slug[0]; // The leaderboard id
  const page = parseInt(slug[1]) || 1; // The page number

  const leaderboard = await scoresaberService.lookupLeaderboard(id);
  let scores: ScoreSaberLeaderboardScoresPageToken | undefined;
  if (fetchScores) {
    scores = await scoresaberService.lookupLeaderboardScores(id + "", page);
  }

  return {
    page: page,
    leaderboard: leaderboard,
    scores: scores,
  };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { leaderboard } = await getLeaderboardData(props, false);
  if (leaderboard === undefined) {
    return {
      title: UNKNOWN_LEADERBOARD.title,
      description: UNKNOWN_LEADERBOARD.description,
      openGraph: {
        title: UNKNOWN_LEADERBOARD.title,
        description: UNKNOWN_LEADERBOARD.description,
      },
    };
  }

  return {
    title: `${leaderboard.songName} ${leaderboard.songSubName} by ${leaderboard.songAuthorName}`,
    openGraph: {
      title: `ScoreSaber Reloaded - ${leaderboard.songName} ${leaderboard.songSubName}`,
      description: `
      Mapper: ${leaderboard.levelAuthorName}
      Plays: ${leaderboard.plays} (${leaderboard.dailyPlays} today)
      Status: ${leaderboard.stars > 0 ? "Ranked" : "Unranked"}
      
      View the scores for ${leaderboard.songName} by ${leaderboard.songAuthorName}!`,
      images: [
        {
          url: leaderboard.coverImage,
        },
      ],
    },
    twitter: {
      card: "summary",
    },
  };
}

export async function generateViewport(props: Props): Promise<Viewport> {
  const { leaderboard } = await getLeaderboardData(props, false);
  if (leaderboard === undefined) {
    return {
      themeColor: Colors.primary,
    };
  }

  const color = await getAverageColor(leaderboard.coverImage);
  if (color === undefined) {
    return {
      themeColor: Colors.primary,
    };
  }

  return {
    themeColor: color?.hex,
  };
}

export default async function LeaderboardPage(props: Props) {
  const { leaderboard, scores, page } = await getLeaderboardData(props);
  if (leaderboard == undefined) {
    return redirect("/");
  }

  return <LeaderboardData initialLeaderboard={leaderboard} initialPage={page} initialScores={scores} />;
}
