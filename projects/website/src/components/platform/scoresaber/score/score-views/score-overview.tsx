import PlayerScoreAccuracyChart from "@/components/platform/scoresaber/score/chart/player-score-accuracy-chart";
import ScoreAccuracyStats from "@/components/score/score-accuracy-stats";
import StatValue from "@/components/statistic/stat-value";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type ScoreOverviewProps = {
  /**
   * The score to display.
   */
  score: ScoreSaberScore;

  /**
   * The score stats for this score.
   */
  scoreStats?: ScoreStatsResponse;

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScoreOverview({ score, scoreStats, leaderboard }: ScoreOverviewProps) {
  if (!scoreStats) {
    return (
      <EmptyState
        icon={<ChartBarIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />}
        title="No Performance Data"
        description="No BeatLeader data found for this score"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:px-2">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex flex-row flex-wrap items-center justify-center gap-2">
          {score.additionalData && <StatValue value={score.additionalData.pauses} name="Pauses" />}
          {scoreStats && (
            <StatValue value={scoreStats.current.winTracker.jumpDistance.toFixed(2)} name="JD" />
          )}
          <StatValue
            value={formatNumberWithCommas(scoreStats.current.hitTracker.maxCombo)}
            name="Max Combo"
          />
        </div>
        <div className="bg-accent-deep border-border flex flex-col items-center justify-center gap-4 rounded-xl border p-4 backdrop-blur-sm">
          <ScoreAccuracyStats scoreStats={scoreStats} />
        </div>
      </div>
      <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
    </div>
  );
}
