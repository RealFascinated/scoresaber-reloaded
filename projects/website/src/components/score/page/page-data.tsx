"use client";

import Card from "@/components/card";
import { FancyLoader } from "@/components/fancy-loader";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { MapStats } from "@/components/score/map-stats";
import { getDecodedReplay } from "@ssr/common/replay/replay-utils";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart3, FileX, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import ScoreDetails from "./components/score-details";

const CutDistributionChart = dynamic(
  () => import("./components/charts/cut-distribution-chart").then(m => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="bg-chart-card flex min-h-[280px] items-center justify-center rounded-lg border">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    ),
  }
);

const SwingSpeedChart = dynamic(() => import("./components/charts/swing-speed-chart").then(m => m.default), {
  ssr: false,
  loading: () => (
    <div className="bg-chart-card flex min-h-[280px] items-center justify-center rounded-lg border">
      <Loader2 className="text-primary size-8 animate-spin" />
    </div>
  ),
});

type ScorePageDataProps = {
  scoreId: string;
  /** From RSC; avoids a duplicate client fetch on first paint when present */
  initialScore?: PlayerScore;
};

export default function ScorePageData({ scoreId, initialScore }: ScorePageDataProps) {
  const hasServerScore = initialScore !== undefined;

  const {
    data: score,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["score", scoreId],
    queryFn: () => ssrApi.getScore(scoreId),
    ...(hasServerScore ? { initialData: initialScore, staleTime: 60_000, refetchOnMount: false } : {}),
  });

  const { data: scoreStats, isLoading: isScoreStatsLoading } = useQuery({
    queryKey: ["scoreStats", score?.score.beatLeaderScore?.scoreId],
    queryFn: () => ssrApi.fetchScoreStats(Number(score?.score.beatLeaderScore?.scoreId)),
    enabled: !!score?.score.beatLeaderScore?.scoreId,
  });

  const beatLeaderScoreId = score?.score.beatLeaderScore?.scoreId;

  const { data: replay, isLoading: isReplayLoading } = useQuery({
    queryKey: ["replayAnalysis", beatLeaderScoreId],
    queryFn: () => getDecodedReplay(beatLeaderScoreId!.toString()),
    enabled: beatLeaderScoreId != null,
  });

  if (isError) {
    return (
      <Card className="flex flex-col items-center justify-center text-center">
        <AlertCircle className="mb-(--spacing-xl) size-16 text-red-500" />
        <h2 className="mb-(--spacing-sm) text-xl font-semibold">Score Not Found</h2>
        <p className="text-muted-foreground">This score has not been tracked or may have been removed.</p>
      </Card>
    );
  }

  if (isLoading || !score) {
    return <FancyLoader title="Loading..." description="Loading score data..." />;
  }

  // Check if we have any additional data to show
  const hasScoreStats = !!scoreStats;
  const hasReplay = !!replay;
  const hasBeatSaver = !!score.beatSaver;
  const hasAnyAdditionalData = hasScoreStats || hasReplay;
  const isAnyDataLoading = isScoreStatsLoading || isReplayLoading;

  return (
    <div className="flex w-full flex-col gap-4">
      <ScoreDetails score={score} />

      {hasBeatSaver && (
        <Card className="rounded-xl">
          <MapStats beatSaver={score.beatSaver} />
        </Card>
      )}

      {isAnyDataLoading && (
        <Card className="flex flex-col items-center justify-center gap-4 py-8">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground">Loading additional score data...</p>
        </Card>
      )}

      {!hasAnyAdditionalData && !isAnyDataLoading ? (
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
