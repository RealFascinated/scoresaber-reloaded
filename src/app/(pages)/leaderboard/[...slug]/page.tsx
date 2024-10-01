import { scoresaberService } from "@/common/service/impl/scoresaber";
import { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Colors } from "@/common/colors";
import { getAverageColor } from "@/common/image-utils";
import { cache } from "react";
import ScoreSaberLeaderboardScoresPageToken from "@/common/model/token/scoresaber/score-saber-leaderboard-scores-page-token";
import { LeaderboardData } from "@/components/leaderboard/leaderboard-data";

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

/**
 * Gets the leaderboard data and scores
 *
 * @param params the params
 * @param fetchScores whether to fetch the scores
 * @returns the leaderboard data and scores
 */
const getLeaderboardData = cache(async ({ params }: Props, fetchScores: boolean = true) => {
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
});

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
    title: `${leaderboard.songName}`,
    openGraph: {
      title: `ScoreSaber Reloaded - ${leaderboard.songName}`,
      description: `
      
      View the scores on ${leaderboard.songName}!`,
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
