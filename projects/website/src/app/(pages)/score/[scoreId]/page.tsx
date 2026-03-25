import ScorePageData from "@/components/score/page/page-data";
import { env } from "@ssr/common/env";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { Metadata } from "next";
import { cache } from "react";

const UNKNOWN_SCORE = {
  title: "Score Not Found",
  description: "This score could not be found or may have been removed.",
};

type ScorePageProps = {
  params: Promise<{
    scoreId: string;
  }>;
};

const getPlayerScore = cache(async (scoreId: string) => {
  return await ssrApi.getScore(scoreId);
});

export async function generateMetadata(props: ScorePageProps): Promise<Metadata> {
  const { scoreId } = await props.params;
  const playerScore = await getPlayerScore(scoreId);

  if (playerScore === undefined) {
    return {
      title: UNKNOWN_SCORE.title,
      description: UNKNOWN_SCORE.description,
      openGraph: {
        siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
        title: UNKNOWN_SCORE.title,
        description: UNKNOWN_SCORE.description,
      },
    };
  }

  const { score, leaderboard } = playerScore;
  const playerName = score.playerInfo.name ?? "Unknown";
  const songTitle = leaderboard.fullName;
  const diffLabel = getDifficultyName(leaderboard.difficulty.difficulty);
  const ppOrScore =
    leaderboard.stars > 0 ? `${formatPp(score.pp)}pp` : `Score ${formatNumberWithCommas(score.score)}`;

  const title = `${playerName} · ${songTitle}`;
  const description = [
    `${score.accuracy.toFixed(2)}%`,
    ppOrScore,
    diffLabel,
    formatDate(score.timestamp, "Do MMMM, YYYY HH:mm a"),
  ].join(" · ");

  return {
    title,
    description,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title,
      description,
      ...(leaderboard.songArt
        ? {
            images: [
              {
                url: leaderboard.songArt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary",
    },
  };
}

export default async function ScorePage({ params }: ScorePageProps) {
  const { scoreId } = await params;
  const initialScore = await getPlayerScore(scoreId);

  return (
    <main className="flex w-full flex-col items-center text-sm">
      <ScorePageData scoreId={scoreId} initialScore={initialScore} />
    </main>
  );
}
