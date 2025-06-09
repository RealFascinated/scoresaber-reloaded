import PlayerScoreAccuracyChart from "@/components/leaderboard/page/chart/player-score-accuracy-chart";
import ScoreAccuracyStats from "@/components/score/score-accuracy-stats";
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
      <div className="flex flex-col items-center justify-center min-h-[150px] p-4 bg-accent-deep rounded-lg border border-border">
        <ChartBarIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          No Performance Data
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Try playing the map again to generate stats
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:px-2 gap-3">
      <ScoreAccuracyStats scoreStats={scoreStats} />
      <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
    </div>
  );
}
