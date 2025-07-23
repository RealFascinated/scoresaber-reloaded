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
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Score Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
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
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-6 flex flex-col items-center space-y-4">
            <AlertCircle className="h-16 w-16 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Limited Score Data
            </h2>
          </div>

          <div className="space-y-3 text-left">
            {!hasScoreStats && (
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  Score statistics unavailable
                </span>
              </div>
            )}
            {!hasReplay && (
              <div className="flex items-center space-x-3">
                <FileX className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  Replay analysis data unavailable
                </span>
              </div>
            )}
          </div>

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
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
