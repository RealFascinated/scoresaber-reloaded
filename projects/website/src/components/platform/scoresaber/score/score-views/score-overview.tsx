import Card from "@/components/card";
import HMDIcon from "@/components/hmd-icon";
import PlayerScoreAccuracyChart from "@/components/platform/scoresaber/score/chart/player-score-accuracy-chart";
import ScoreAccuracyStats from "@/components/score/score-accuracy-stats";
import StatValue from "@/components/statistic/stat-value";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { getHMDInfo } from "@ssr/common/hmds";
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
    <div className="flex w-full flex-col gap-2 md:flex-row">
      {/* Stats */}
      <Card className="mb-2 flex w-full flex-col items-center justify-center gap-3 rounded-xl md:mb-0 md:max-w-[360px]">
        <div className="flex w-full flex-row flex-wrap items-center justify-center gap-2">
          {score.additionalData && <StatValue value={score.additionalData.pauses} name="Pauses" />}
          {scoreStats && (
            <StatValue value={scoreStats.current.winTracker.jumpDistance.toFixed(2)} name="JD" />
          )}
          <StatValue
            value={formatNumberWithCommas(scoreStats.current.hitTracker.maxCombo)}
            name="Max Combo"
          />
          {score.hmd && (
            <StatValue
              value={
                <div className="flex items-center gap-2">
                  <HMDIcon hmd={getHMDInfo(score.hmd!)} />
                  <p>{score.hmd}</p>
                </div>
              }
              name="HMD"
            />
          )}
          {!score.fullCombo && score.additionalData && (
            <StatValue
              value={
                <div className="flex items-center gap-2">
                  <p>{score.additionalData.fcAccuracy.toFixed(2)}%</p>
                </div>
              }
              name="FC Acc"
            />
          )}
        </div>
        <div className="bg-accent-deep border-border flex w-full flex-col items-center justify-center gap-3 rounded-md border p-3 backdrop-blur-sm">
          <ScoreAccuracyStats scoreStats={scoreStats} />
        </div>
      </Card>

      {/* Accuracy Chart */}
      <div className="flex min-h-[220px] w-full items-center justify-center md:min-h-[320px]">
        <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
      </div>
    </div>
  );
}
