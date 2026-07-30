"use client";

import Card from "@/components/card";
import { FancyLoader } from "@/components/fancy-loader";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { SharedIcons } from "@/shared-icons";
import { getDecodedReplay } from "@ssr/common/replay/replay-utils";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import ScoreDetails from "./components/score-details";

const CutDistributionChart = dynamic(
  () => import("./components/charts/cut-distribution-chart").then(m => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="bg-chart-card ring-border flex min-h-[280px] items-center justify-center rounded-xl ring-1">
        <SharedIcons.PageLoadingIcon className="text-primary size-8 animate-spin" />
      </div>
    ),
  }
);

const SwingSpeedChart = dynamic(() => import("./components/charts/swing-speed-chart").then(m => m.default), {
  ssr: false,
  loading: () => (
    <div className="bg-chart-card ring-border flex min-h-[280px] items-center justify-center rounded-xl ring-1">
      <SharedIcons.PageLoadingIcon className="text-primary size-8 animate-spin" />
    </div>
  ),
});

type ScorePageDataProps = {
  scoreId: string;
  initialScore?: PlayerScore<ScoreSaberScore>;
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
        <SharedIcons.WarningAlertIcon className="mb-(--spacing-xl) size-16 text-red-500" />
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
  const hasAnyAdditionalData = hasScoreStats || hasReplay;
  const isAnyDataLoading = isScoreStatsLoading || isReplayLoading;

  return (
    <div className="flex w-full flex-col gap-4">
      <ScoreDetails score={score} />

      {isAnyDataLoading && (
        <div className="ring-border bg-card flex flex-col items-center justify-center gap-4 rounded-xl py-8 ring-1">
          <SharedIcons.PageLoadingIcon className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground">Loading additional score data...</p>
        </div>
      )}

      {!hasAnyAdditionalData && !isAnyDataLoading ? (
        <div className="ring-border bg-card flex flex-col items-center justify-center gap-2 rounded-xl py-8 text-center ring-1">
          <SharedIcons.LeaderboardEmptyStateIcon className="text-muted-foreground size-10" />
          <h3 className="font-semibold">Basic Score View</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Advanced stats and replay analysis are only available for scores tracked by BeatLeader.
          </p>
        </div>
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
