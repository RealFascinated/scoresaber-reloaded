import Card from "@/components/card";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { MapStats } from "@/components/score/map-stats";
import ScoreDetails from "@/components/score/page/components/score-details";
import { env } from "@ssr/common/env";
import { getDecodedReplay } from "@ssr/common/replay/replay-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { AlertCircle, BarChart3, FileX } from "lucide-react";
import { Metadata } from "next";
import { cache } from "react";
import CutDistributionChart from "../../../../components/score/page/components/charts/cut-distribution-chart";
import SwingSpeedChart from "../../../../components/score/page/components/charts/swing-speed-chart";

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
  const playerName = score.playerInfo!.name;
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
  const score = await getPlayerScore(scoreId);
  const beatLeaderScoreId = score?.score.beatLeaderScore?.scoreId;

  const [scoreStats, replay] = await Promise.all([
    beatLeaderScoreId ? ssrApi.fetchScoreStats(beatLeaderScoreId) : undefined,
    beatLeaderScoreId ? getDecodedReplay(beatLeaderScoreId.toString()) : undefined,
  ]);

  if (score === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="size-16 text-amber-500" />
        <h2 className="text-xl font-semibold">Score Not Found</h2>
        <p className="text-muted-foreground">This score could not be found or may have been removed.</p>
      </div>
    );
  }

  // Check if we have any additional data to show
  const hasScoreStats = !!scoreStats;
  const hasReplay = !!replay;
  const hasBeatSaver = !!score.beatSaver;
  const hasAnyAdditionalData = hasScoreStats || hasReplay;

  return (
    <div className="flex w-full flex-col gap-4">
      <ScoreDetails score={score} />

      {hasBeatSaver && (
        <Card className="rounded-xl">
          <MapStats beatSaver={score.beatSaver} />
        </Card>
      )}

      {!hasAnyAdditionalData ? (
        <Card className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-6 flex flex-col items-center gap-4">
            <AlertCircle className="size-16 text-amber-500" />
            <h2 className="text-xl font-semibold">Limited Score Data</h2>
          </div>

          <div className="mb-6 flex flex-col gap-3 text-left">
            {!hasScoreStats && (
              <div className="flex items-center gap-3">
                <BarChart3 className="text-muted-foreground size-5" />
                <span className="text-muted-foreground">Score statistics unavailable</span>
              </div>
            )}
            {!hasReplay && (
              <div className="flex items-center gap-3">
                <FileX className="text-muted-foreground size-5" />
                <span className="text-muted-foreground">Replay analysis data unavailable</span>
              </div>
            )}
          </div>

          <p className="text-muted-foreground text-sm">Some data may not be available for this score.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {scoreStats && (
            <>
              <ScoreOverview score={score.score} scoreStats={scoreStats} leaderboard={score.leaderboard} />
            </>
          )}

          {replay && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CutDistributionChart cutDistribution={replay.cutDistribution} />
              <SwingSpeedChart
                swingSpeed={replay.swingSpeed}
                replayLengthSeconds={replay.replayLengthSeconds}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
