"use client";

import Card from "@/components/card";
import { FancyLoader } from "@/components/fancy-loader";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { getDecodedReplay } from "@ssr/common/replay/replay-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart3, FileX } from "lucide-react";
import CutDistributionChart from "./components/charts/cut-distribution-chart";
import ScoreDetails from "./components/score-details";

export default function ScorePageData({ scoreId }: { scoreId: string }) {
  const {
    data: score,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["score", scoreId],
    queryFn: () => ssrApi.getScore(scoreId),
  });

  const { data: scoreStats, isLoading: isScoreStatsLoading } = useQuery({
    queryKey: ["scoreStats", score?.score.additionalData?.scoreId],
    queryFn: () => ssrApi.fetchScoreStats(Number(score?.score.additionalData?.scoreId)),
    enabled: !!score?.score.additionalData?.scoreId,
  });

  const { data: replay, isLoading: isReplayLoading } = useQuery({
    queryKey: ["replayAnalysis", score],
    queryFn: () => getDecodedReplay(score?.score.additionalData?.scoreId + ""),
    enabled: !!score?.score.additionalData?.scoreId,
  });

  if (isError) {
    return (
      <Card className="flex flex-col items-center justify-center text-center">
        <AlertCircle className="mb-(--spacing-xl) h-16 w-16 text-red-500" />
        <h2 className="mb-(--spacing-sm) text-xl font-semibold">Score Not Found</h2>
        <p className="text-muted-foreground">
          This score has not been tracked or may have been removed.
        </p>
      </Card>
    );
  }

  if (isLoading || !score) {
    return <FancyLoader title="Loading..." description="Loading score data..." />;
  }

  // Check if we have any additional data to show
  const hasScoreStats = !!scoreStats;
  const hasReplay = !!replay;
  const hasAnyAdditionalData = hasScoreStats || hasReplay;
  const isAnyDataLoading = isScoreStatsLoading || isReplayLoading;

  return (
    <div className="w-full space-y-4">
      <ScoreDetails score={score} />

      {!hasAnyAdditionalData && !isAnyDataLoading ? (
        <Card className="flex flex-col items-center justify-center text-center">
          <div className="mb-(--spacing-2xl) flex flex-col items-center gap-(--spacing-xl)">
            <AlertCircle className="h-16 w-16 text-amber-500" />
            <h2 className="text-xl font-semibold">Limited Score Data</h2>
          </div>

          <div className="mb-(--spacing-lg) flex flex-col gap-(--spacing-lg) text-left">
            {!hasScoreStats && (
              <div className="flex items-center gap-(--spacing-lg)">
                <BarChart3 className="text-muted-foreground h-5 w-5" />
                <span className="text-muted-foreground">Score statistics unavailable</span>
              </div>
            )}
            {!hasReplay && (
              <div className="flex items-center gap-(--spacing-lg)">
                <FileX className="text-muted-foreground h-5 w-5" />
                <span className="text-muted-foreground">Replay analysis data unavailable</span>
              </div>
            )}
          </div>

          <p className="text-muted-foreground text-sm">
            Some data may not be available for this score.
          </p>
        </Card>
      ) : (
        <>
          {scoreStats && (
            <ScoreOverview
              score={score.score}
              scoreStats={scoreStats}
              leaderboard={score.leaderboard}
            />
          )}

          {isReplayLoading && <p>Loading replay...</p>}
          {replay && (
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:flex-row">
              <CutDistributionChart cutDistribution={replay.cutDistribution} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
