import PlayerScoreAccuracyChart from "@/components/leaderboard/page/chart/player-score-accuracy-chart";
import ScoreAccuracyStats from "@/components/score/score-accuracy-stats";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";

type ScoreOverviewProps = {
  /**
   * The score stats for this score.
   */
  scoreStats?: ScoreStatsResponse;

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScoreOverview({ scoreStats, leaderboard }: ScoreOverviewProps) {
  if (!scoreStats) {
    return (
      <EmptyState
        icon={<ChartBarIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />}
        title="No Performance Data"
        description="Try playing the map again to generate stats"
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:px-2 gap-3">
      <ScoreAccuracyStats scoreStats={scoreStats} />
      <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
    </div>
  );
}
